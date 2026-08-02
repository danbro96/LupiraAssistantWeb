import * as AuthSession from 'expo-auth-session';
import { OIDC_CLIENT_ID, OIDC_ISSUER } from './oidc-config';
import { REQUEST_TIMEOUT_MS } from '../../domain/api-error';
import { logDebug } from '../../debug/log';

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

/** `definitive` = token/client rejected (re-auth required); else transient — keep session, retry later. */
export class RefreshError extends Error {
  definitive: boolean;
  constructor(definitive: boolean, message: string) {
    super(message);
    this.definitive = definitive;
    this.name = 'RefreshError';
  }
}

async function postForm(endpoint: string, params: Record<string, string>): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(params).toString(),
      signal: controller.signal,
    });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

/** Manual fetch so raw status/body are visible in logs. */
export async function exchangeAuthCode(params: {
  tokenEndpoint: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<TokenSet> {
  const form: Record<string, string> = {
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: OIDC_CLIENT_ID,
  };
  if (params.codeVerifier) form.code_verifier = params.codeVerifier;

  logDebug('oidc:token:post', params.tokenEndpoint);
  const { status, text } = await postForm(params.tokenEndpoint, form);
  logDebug('oidc:token:response', `status=${status} len=${text.length}`);
  if (status < 200 || status >= 300) throw new Error(`token ${status}: ${text.slice(0, 400)}`);
  if (!text) throw new Error(`token ${status}: empty body`);

  const json = JSON.parse(text) as {
    access_token: string; refresh_token?: string; id_token?: string; expires_in?: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    idToken: json.id_token,
    expiresIn: json.expires_in,
  };
}

let discoveryPromise: Promise<AuthSession.DiscoveryDocument> | null = null;

export function getDiscovery(): Promise<AuthSession.DiscoveryDocument> {
  if (!discoveryPromise) {
    // Clear on failure so a failed discovery doesn't poison the cache.
    discoveryPromise = AuthSession.fetchDiscoveryAsync(OIDC_ISSUER).catch((e) => {
      discoveryPromise = null;
      throw e;
    });
  }
  return discoveryPromise;
}

export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  let discovery: AuthSession.DiscoveryDocument;
  try {
    discovery = await getDiscovery();
  } catch (e) {
    throw new RefreshError(false, `discovery: ${e instanceof Error ? e.message : String(e)}`);
  }
  const tokenEndpoint = discovery.tokenEndpoint;
  if (!tokenEndpoint) throw new RefreshError(false, 'discovery: no token endpoint');

  let status: number;
  let text: string;
  try {
    ({ status, text } = await postForm(tokenEndpoint, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OIDC_CLIENT_ID,
    }));
  } catch (e) {
    throw new RefreshError(false, `network: ${e instanceof Error ? e.message : String(e)}`);
  }

  logDebug('oidc:refresh:response', `status=${status} len=${text.length}`);
  if (status === 400 || status === 401) throw new RefreshError(true, `refresh ${status}`);
  if (status < 200 || status >= 300) throw new RefreshError(false, `refresh ${status}`);
  if (!text) throw new RefreshError(false, 'refresh: empty body');

  const json = JSON.parse(text) as {
    access_token: string; refresh_token?: string; id_token?: string; expires_in?: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    idToken: json.id_token,
    expiresIn: json.expires_in,
  };
}

/** Claims only — no signature check (the server verifies). */
export function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) return {};
  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  try {
    const bytes = globalThis.atob(b64);
    const json = decodeURIComponent(
      Array.prototype.map.call(bytes, (c: string) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
