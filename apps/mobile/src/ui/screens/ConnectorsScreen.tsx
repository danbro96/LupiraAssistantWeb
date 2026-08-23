import { memo, useEffect, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../../state/settings-store';
import type { ConnectorStatusDto } from '../../data/api/generated/comms/models';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';

// Read-only capture status per source. Connectors are enrolled server-side (ops CLI), so there is
// nothing to toggle here — this answers "is my mail/Telegram still arriving?".

type Styles = ReturnType<typeof makeStyles>;

export function ConnectorsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const connectors = useSettings((s) => s.connectors);
  const loading = useSettings((s) => s.loadingConnectors);

  useEffect(() => {
    void useSettings.getState().loadConnectors();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading && connectors.length > 0}
          onRefresh={() => void useSettings.getState().loadConnectors()}
          tintColor={c.primary}
        />
      }
    >
      {connectors.length === 0 ? (
        loading ? (
          <ActivityIndicator color={c.primary} style={styles.spinner} />
        ) : (
          <Text style={styles.hint}>Capture status is unavailable.</Text>
        )
      ) : (
        connectors.map((connector) => (
          <ConnectorCard key={connector.source} connector={connector} styles={styles} />
        ))
      )}

      <Text style={styles.footnote}>Sources are connected on the server; this view is read-only.</Text>
    </ScrollView>
  );
}

const ConnectorCard = memo(function ConnectorCard({
  connector,
  styles,
}: {
  connector: ConnectorStatusDto;
  styles: Styles;
}) {
  const connected = connector.connectors.length > 0;
  const last = connector.lastMessageAt ? new Date(connector.lastMessageAt).toLocaleString() : 'never';
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.source}>{connector.source}</Text>
        <Text style={[styles.badge, connected ? styles.connected : styles.idle]}>
          {connected ? 'connected' : 'not connected'}
        </Text>
      </View>
      <Text style={styles.hint}>
        {connector.messageCount.toLocaleString()} captured · last {last}
      </Text>
      {connected ? <Text style={styles.mono}>{connector.connectors.join(', ')}</Text> : null}
    </View>
  );
});

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.sm },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    source: { ...t.body, fontWeight: '600' },
    badge: { ...t.hint, fontWeight: '700' },
    connected: { color: c.success },
    idle: { color: c.textSubtle },
    hint: { ...t.small },
    mono: { ...t.mono },
    footnote: { ...t.hint, textAlign: 'center', marginTop: spacing.md },
    spinner: { marginTop: spacing.lg },
  });
};
