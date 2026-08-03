import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInbox, type GrantStatus } from '../../state/inbox-store';
import { useAuth } from '../../state/auth-store';
import { launchConnect } from '../../data/auth/connect';
import type { InboxItemView } from '@lupira/assistant-domain/inbox-item';
import { payloadSlotFor } from '@lupira/assistant-domain/edit-spec';
import type { RootStackParamList } from '../navigation/types';
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

  // Pull-on-open freshness (until push lands): the cached feed renders instantly, then updates.
  useEffect(() => {
    void useInbox.getState().refresh();
    void useInbox.getState().refreshGrant();
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
        items.map((item) => {
          if (item.kind === 'question') return <QuestionCard key={item.id} item={item} c={c} />;
          if (item.kind === 'notice') return <NoticeCard key={item.id} item={item} c={c} />;
          return <ProposalCard key={item.id} item={item} c={c} />;
        })
      )}

      <Text style={styles.footnote}>Gestures queue offline and sync when connected.</Text>
    </ScrollView>
  );
}

function ItemHeader({ item, c }: { item: InboxItemView; c: Palette }) {
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <>
      <View style={styles.itemHeader}>
        <Text style={styles.kind}>{item.kind.toUpperCase()}</Text>
        <Text style={styles.when}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {item.summary ? <Text style={styles.summary}>{item.summary}</Text> : null}
    </>
  );
}

function ProposalCard({ item, c }: { item: InboxItemView; c: Palette }) {
  const styles = useMemo(() => makeStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const editable = item.proposal != null && payloadSlotFor(item.proposal.actionKind) !== null;
  return (
    <View style={styles.card}>
      <ItemHeader item={item} c={c} />
      <View style={styles.actions}>
        <Button
          title="Approve"
          onPress={() => void useInbox.getState().resolve(item.id, { action: 'Approve' })}
          style={styles.actionBtn}
        />
        {editable ? (
          <Button
            title="Edit"
            variant="secondary"
            onPress={() => navigation.navigate('EditProposal', { itemId: item.id })}
            style={styles.actionBtn}
          />
        ) : null}
        <Button
          title="Dismiss"
          variant="destructive"
          onPress={() => void useInbox.getState().resolve(item.id, { action: 'Dismiss' })}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

function NoticeCard({ item, c }: { item: InboxItemView; c: Palette }) {
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.card}>
      <ItemHeader item={item} c={c} />
      <View style={styles.actions}>
        <Button
          title="Got it"
          variant="secondary"
          onPress={() => void useInbox.getState().markRead(item.id)}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

function QuestionCard({ item, c }: { item: InboxItemView; c: Palette }) {
  const styles = useMemo(() => makeStyles(c), [c]);
  const [answer, setAnswer] = useState('');
  return (
    <View style={styles.card}>
      <ItemHeader item={item} c={c} />
      <TextInput
        style={styles.answerInput}
        value={answer}
        onChangeText={setAnswer}
        placeholder="Your answer…"
        placeholderTextColor={c.textMuted}
        multiline
      />
      <View style={styles.actions}>
        <Button
          title="Answer"
          disabled={answer.trim().length === 0}
          onPress={() => void useInbox.getState().answer(item.id, { answer: answer.trim() })}
          style={styles.actionBtn}
        />
        <Button
          title="Skip"
          variant="secondary"
          onPress={() => void useInbox.getState().answer(item.id, { skip: true })}
          style={styles.actionBtn}
        />
      </View>
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
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    actionBtn: { flex: 1 },
    answerInput: {
      ...t.body,
      backgroundColor: c.bg,
      borderRadius: radii.md,
      padding: spacing.sm,
      minHeight: 44,
      color: c.text,
    },
    footnote: { ...t.hint, textAlign: 'center', marginTop: spacing.md },
  });
};
