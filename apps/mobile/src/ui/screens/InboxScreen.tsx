import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useInbox, type GrantStatus } from '../../state/inbox-store';
import { useAuth } from '../../state/auth-store';
import { launchConnect } from '../../data/auth/connect';
import type { InboxItemView } from '@lupira/assistant-domain/inbox-item';
import { Button } from '../components/Button';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';
import { toast } from '../../feedback/toast';

const GRANT_TEXT: Record<GrantStatus, string> = {
  connected: 'Assistant connected.',
  'reauth-needed': 'Reconnect the assistant to keep it acting on your behalf.',
  unknown: 'Connect the assistant so it can act on your behalf.',
};

export function InboxScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const items = useInbox((s) => s.items);
  const grantStatus = useInbox((s) => s.grantStatus);
  const assistantApiUrl = useAuth((s) => s.assistantApiUrl);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await useInbox.getState().refresh();
    setRefreshing(false);
  }, []);

  async function onConnect() {
    setConnecting(true);
    const res = await launchConnect(assistantApiUrl);
    if (res === 'returned') {
      await useInbox.getState().refreshGrant();
      toast('Assistant connection updated.');
    }
    setConnecting(false);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.primary} />}
    >
      <View style={[styles.card, styles.grantCard]}>
        <Text style={styles.grantText}>{GRANT_TEXT[grantStatus]}</Text>
        {grantStatus !== 'connected' ? (
          <Button
            title="Connect assistant"
            onPress={() => void onConnect()}
            loading={connecting}
            style={styles.btn}
          />
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>No suggestions yet.</Text>
          <Text style={styles.emptyHint}>When the assistant has something for you, it shows up here.</Text>
        </View>
      ) : (
        items.map((item) => <ItemCard key={item.id} item={item} c={c} />)
      )}

      <Text style={styles.footnote}>Approve, edit, or dismiss in Telegram.</Text>
    </ScrollView>
  );
}

function ItemCard({ item, c }: { item: InboxItemView; c: Palette }) {
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.card}>
      <View style={styles.itemHeader}>
        <Text style={styles.kind}>{item.kind.toUpperCase()}</Text>
        <Text style={styles.when}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {item.summary ? <Text style={styles.summary}>{item.summary}</Text> : null}
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.sm },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
    grantCard: { gap: spacing.sm },
    grantText: { ...t.body },
    btn: { marginTop: spacing.xs },
    empty: { ...t.bodyLg },
    emptyHint: { ...t.small },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    kind: { ...t.sectionLabel, color: c.primary },
    when: { ...t.mono },
    title: { ...t.body, fontWeight: '600' },
    summary: { ...t.small },
    footnote: { ...t.hint, textAlign: 'center', marginTop: spacing.md },
  });
};
