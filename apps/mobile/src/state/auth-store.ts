import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_HEALTH_API_URL, DEFAULT_LOCATION_API_URL, DEFAULT_ASSISTANT_API_URL } from '../config/env';
import { SECURE_KEYS } from '../config/secure-keys';
import { setOidcAuthPort, setDeviceKeyPort, type ApiBase } from '../data/api/auth-ports';
import { refreshTokens, RefreshError } from '../data/auth/oidc';
import { getApiKey } from '../data/secure/device-credentials';
import { logDebug } from '../debug/log';
import { toast } from '../feedback/toast';

// OIDC session — used by device registration (LocationApi) and health record/bootstrap (HealthApi); ingest uses the device key.

let refreshing: Promise<string | null> | null = null;

export interface AuthUser {
  sub: string; // email / OIDC subject
  displayName?: string;
}

export interface Session {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number; // epoch ms
}

interface AuthState {
  loaded: boolean;
  healthApiUrl: string;
  locationApiUrl: string;
  assistantApiUrl: string;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
}

interface AuthActions {
  load: () => Promise<void>;
  setHealthApiUrl: (url: string) => Promise<void>;
  setLocationApiUrl: (url: string) => Promise<void>;
  setAssistantApiUrl: (url: string) => Promise<void>;
  setSession: (session: Session, user: AuthUser) => Promise<void>;
  clearSession: (opts?: { reason?: 'expired' }) => Promise<void>;
  refreshIfNeeded: (opts?: { force?: boolean; sentToken?: string }) => Promise<string | null>;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState & AuthActions>((set, get) => ({
  loaded: false,
  healthApiUrl: DEFAULT_HEALTH_API_URL,
  locationApiUrl: DEFAULT_LOCATION_API_URL,
  assistantApiUrl: DEFAULT_ASSISTANT_API_URL,
  token: null,
  refreshToken: null,
  expiresAt: null,
  user: null,

  load: async () => {
    const [healthApiUrl, locationApiUrl, assistantApiUrl, token, refreshToken, expiresAt, userSub, userName] = await Promise.all([
      SecureStore.getItemAsync(SECURE_KEYS.healthApiUrl),
      SecureStore.getItemAsync(SECURE_KEYS.locationApiUrl),
      SecureStore.getItemAsync(SECURE_KEYS.assistantApiUrl),
      SecureStore.getItemAsync(SECURE_KEYS.oidcToken),
      SecureStore.getItemAsync(SECURE_KEYS.oidcRefresh),
      SecureStore.getItemAsync(SECURE_KEYS.oidcExpires),
      SecureStore.getItemAsync(SECURE_KEYS.userSub),
      SecureStore.getItemAsync(SECURE_KEYS.userName),
    ]);
    set({
      loaded: true,
      healthApiUrl: healthApiUrl || DEFAULT_HEALTH_API_URL,
      locationApiUrl: locationApiUrl || DEFAULT_LOCATION_API_URL,
      assistantApiUrl: assistantApiUrl || DEFAULT_ASSISTANT_API_URL,
      token: token ?? null,
      refreshToken: refreshToken ?? null,
      expiresAt: expiresAt ? Number(expiresAt) : null,
      user: userSub ? { sub: userSub, displayName: userName ?? undefined } : null,
    });
  },

  setHealthApiUrl: async (url) => {
    await SecureStore.setItemAsync(SECURE_KEYS.healthApiUrl, url);
    set({ healthApiUrl: url });
  },

  setLocationApiUrl: async (url) => {
    await SecureStore.setItemAsync(SECURE_KEYS.locationApiUrl, url);
    set({ locationApiUrl: url });
  },

  setAssistantApiUrl: async (url) => {
    await SecureStore.setItemAsync(SECURE_KEYS.assistantApiUrl, url);
    set({ assistantApiUrl: url });
  },

  setSession: async (session, user) => {
    // in-memory first: a rotated refresh token must survive a persistence failure
    set({
      token: session.accessToken,
      refreshToken: session.refreshToken ?? null,
      expiresAt: session.expiresAt,
      user,
    });
    try {
      await Promise.all([
        SecureStore.setItemAsync(SECURE_KEYS.oidcToken, session.accessToken),
        session.refreshToken
          ? SecureStore.setItemAsync(SECURE_KEYS.oidcRefresh, session.refreshToken)
          : SecureStore.deleteItemAsync(SECURE_KEYS.oidcRefresh),
        SecureStore.setItemAsync(SECURE_KEYS.oidcExpires, String(session.expiresAt)),
        SecureStore.setItemAsync(SECURE_KEYS.userSub, user.sub),
        user.displayName
          ? SecureStore.setItemAsync(SECURE_KEYS.userName, user.displayName)
          : SecureStore.deleteItemAsync(SECURE_KEYS.userName),
      ]);
    } catch (e) {
      logDebug('auth:persist-error', e instanceof Error ? e.message : String(e));
    }
  },

  clearSession: async (opts) => {
    if (opts?.reason === 'expired') toast('Session expired — please sign in again.');
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.oidcToken),
      SecureStore.deleteItemAsync(SECURE_KEYS.oidcRefresh),
      SecureStore.deleteItemAsync(SECURE_KEYS.oidcExpires),
      SecureStore.deleteItemAsync(SECURE_KEYS.userSub),
      SecureStore.deleteItemAsync(SECURE_KEYS.userName),
    ]);
    set({ token: null, refreshToken: null, expiresAt: null, user: null });
  },

  refreshIfNeeded: async (opts) => {
    const { token, refreshToken, expiresAt, user } = get();
    if (!token) return null;
    const force = opts?.force ?? false;
    if (force && opts?.sentToken && opts.sentToken !== token) return token;
    const fresh = expiresAt ? Date.now() < expiresAt - 60_000 : false;
    if (!force && fresh) return token;
    if (!refreshToken || !user) {
      if (force) {
        await get().clearSession({ reason: 'expired' });
        return null;
      }
      return token;
    }
    if (refreshing) return refreshing;
    refreshing = (async (): Promise<string | null> => {
      try {
        const t = await refreshTokens(refreshToken);
        if (!t.accessToken) return token;
        const next: Session = {
          accessToken: t.accessToken,
          refreshToken: t.refreshToken ?? refreshToken,
          expiresAt: Date.now() + (t.expiresIn ?? 3600) * 1000,
        };
        await get().setSession(next, user);
        return next.accessToken;
      } catch (e) {
        if (e instanceof RefreshError && e.definitive) {
          logDebug('auth:logout', `definitive: ${e.message}`);
          await get().clearSession({ reason: 'expired' });
          return null;
        }
        logDebug('auth:refresh:transient', e instanceof Error ? e.message : String(e));
        return token;
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  },

  isAuthenticated: () => !!get().token && !!get().user,
}));

// Runs at module load (App.tsx imports the store during bootstrap, before any request fires).
const apiUrlFor = (base: ApiBase): string => {
  const s = useAuth.getState();
  if (base === 'location') return s.locationApiUrl;
  if (base === 'assistant') return s.assistantApiUrl;
  return s.healthApiUrl;
};

setOidcAuthPort({
  getApiUrl: apiUrlFor,
  getToken: () => useAuth.getState().token,
  refresh: (force, sentToken) => useAuth.getState().refreshIfNeeded({ force, sentToken }),
});

setDeviceKeyPort({
  getApiUrl: apiUrlFor,
  getApiKey: () => getApiKey(),
});
