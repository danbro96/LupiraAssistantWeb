import { useEffect } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';
import { RootStack } from './src/ui/navigation/RootStack';
import { ToastHost } from './src/ui/components/ToastHost';
import { useAuth } from './src/state/auth-store';
import { useDevice } from './src/state/device-store';
import { useInbox } from './src/state/inbox-store';
import { useCollector } from './src/state/collector-store';
import { startSyncTriggers, kickSync } from './src/sync/sync-engine';
import { registerUploadTask } from './src/sync/background-upload-task';
import { SENTRY_DSN, APP_VERSION } from './src/config/env';
import { lightColors, darkColors, type Palette } from './src/ui/theme';

function navTheme(scheme: string | null | undefined): Theme {
  const p = scheme === 'dark' ? darkColors : lightColors;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: p.primary, background: p.bg, card: p.bg, text: p.text, border: p.divider, notification: p.danger },
  };
}

// SENTRY_DSN is a public client key; Sentry no-ops when empty.
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  release: APP_VERSION,
  dist: APP_VERSION,
  environment: __DEV__ ? 'development' : 'production',
});

function ErrorFallback({ palette }: { palette: Palette }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: palette.bg }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: palette.text, marginBottom: 8 }}>Something went wrong</Text>
      <Text style={{ color: palette.textMuted, textAlign: 'center' }}>
        The app hit an unexpected error. Please reopen it — your buffered fixes are saved on this device.
      </Text>
    </View>
  );
}

function App() {
  const authLoaded = useAuth((s) => s.loaded);
  const deviceLoaded = useDevice((s) => s.loaded);
  const scheme = useColorScheme();

  useEffect(() => {
    void (async () => {
      await Promise.all([
        useAuth.getState().load(),
        useDevice.getState().load(),
        useInbox.getState().loadFromCache(),
      ]);
      await useAuth.getState().refreshIfNeeded();
      await useCollector.getState().hydrate();
      await registerUploadTask();
      void kickSync({ resume: true, poll: true });
    })();
    const stopTriggers = startSyncTriggers();
    return stopTriggers;
  }, []);

  if (!authLoaded || !deviceLoaded) return null;

  const palette = scheme === 'dark' ? darkColors : lightColors;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Sentry.ErrorBoundary fallback={<ErrorFallback palette={palette} />}>
          <NavigationContainer theme={navTheme(scheme)}>
            <RootStack />
          </NavigationContainer>
        </Sentry.ErrorBoundary>
        <ToastHost />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(App);
