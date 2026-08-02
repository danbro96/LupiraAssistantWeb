import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import {
  OIDC_CLIENT_ID,
  OIDC_ISSUER,
  OIDC_REDIRECT_PATH,
  OIDC_SCHEME,
  OIDC_SCOPES,
} from '../../data/auth/oidc-config';
import { decodeJwt, exchangeAuthCode } from '../../data/auth/oidc';
import { useAuth } from '../../state/auth-store';
import { useDevice } from '../../state/device-store';
import { Button } from '../components/Button';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';
import { logDebug } from '../../debug/log';

// Dismisses the in-app browser when the auth redirect returns.
WebBrowser.maybeCompleteAuthSession();

export function RegisterDeviceScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const authed = useAuth((s) => !!s.token && !!s.user);
  const userEmail = useAuth((s) => s.user?.sub ?? null);

  const discovery = AuthSession.useAutoDiscovery(OIDC_ISSUER);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: OIDC_SCHEME, path: OIDC_REDIRECT_PATH });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: OIDC_CLIENT_ID, scopes: OIDC_SCOPES, redirectUri, usePKCE: true },
    discovery,
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(Device.deviceName ?? Device.modelName ?? 'My phone');

  async function handleSignIn() {
    setError(null);
    try {
      // createTask:false keeps the auth tab in the app's task so the redirect returns into it.
      await promptAsync({ createTask: false });
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    if (!response || response.type !== 'success' || !discovery || !request) return;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const tokenEndpoint = discovery.tokenEndpoint;
        if (!tokenEndpoint) {
          setError('Discovery returned no token endpoint.');
          return;
        }
        const token = await exchangeAuthCode({
          tokenEndpoint,
          code: response.params.code,
          redirectUri,
          codeVerifier: request.codeVerifier,
        });
        const claims = decodeJwt(token.idToken ?? token.accessToken);
        const email = (claims.email as string) ?? (claims.preferred_username as string) ?? (claims.sub as string) ?? '';
        const name = (claims.name as string) ?? undefined;
        await useAuth.getState().setSession(
          {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: Date.now() + (token.expiresIn ?? 3600) * 1000,
          },
          { sub: email, displayName: name },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logDebug('register:signin-error', msg);
        setError(msg);
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function handleRegister() {
    setBusy(true);
    setError(null);
    const res = await useDevice.getState().register(label.trim() || 'My phone');
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Registration failed.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lupira Assistant</Text>
      <Text style={styles.subtitle}>Set this phone up to record telemetry.</Text>

      {!authed ? (
        <>
          <Text style={styles.step}>Step 1 — sign in</Text>
          <Button
            title="Sign in with Authentik"
            onPress={() => void handleSignIn()}
            disabled={!request || busy}
            loading={busy}
          />
        </>
      ) : (
        <>
          <Text style={styles.step}>Step 2 — register this phone</Text>
          <Text style={styles.signedIn}>Signed in as {userEmail}</Text>
          <Text style={styles.fieldLabel}>Device label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="My phone"
            placeholderTextColor={c.textSubtle}
            style={styles.input}
            autoCapitalize="words"
          />
          <Button title="Register this phone" onPress={() => void handleRegister()} loading={busy} />
        </>
      )}

      {busy && !authed ? <ActivityIndicator style={styles.spinner} color={c.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: c.bg, gap: spacing.md },
    title: { ...t.title, textAlign: 'center' },
    subtitle: { ...t.small, textAlign: 'center', marginBottom: spacing.lg },
    step: { ...t.sectionLabel, marginTop: spacing.md },
    signedIn: { ...t.small },
    fieldLabel: { ...t.sectionLabel, marginTop: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: c.text,
      fontSize: 16,
    },
    spinner: { marginTop: spacing.md },
    error: { color: c.danger, textAlign: 'center', marginTop: spacing.md },
  });
};
