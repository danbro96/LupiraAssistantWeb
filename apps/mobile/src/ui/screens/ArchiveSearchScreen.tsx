import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useArchive } from '../../state/archive-store';
import type { ArchiveSearchHitDto } from '../../data/api/generated/comms/models';
import { Button } from '../components/Button';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';
import type { RootStackParamList } from '../navigation/types';

// Research entry point: hybrid search over the whole corpus. A hit deep-links into its thread,
// centred on the matched message.

export function ArchiveSearchScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const hits = useArchive((s) => s.hits);
  const searching = useArchive((s) => s.searching);
  const searchError = useArchive((s) => s.searchError);
  const [q, setQ] = useState('');
  const [participant, setParticipant] = useState('');

  function onSearch() {
    void useArchive.getState().search({ q, participant: participant.trim() || undefined });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Search messages…"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        <TextInput
          style={styles.input}
          value={participant}
          onChangeText={setParticipant}
          placeholder="From (sender name, optional)"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <Button title="Search" onPress={onSearch} loading={searching} style={styles.grow} />
          <Button
            title="Threads"
            variant="secondary"
            onPress={() => navigation.navigate('Conversations')}
            style={styles.grow}
          />
        </View>
      </View>

      {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

      <FlatList
        data={hits}
        keyExtractor={(h) => h.messageId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          searching ? (
            <ActivityIndicator color={c.primary} style={styles.spinner} />
          ) : (
            <Text style={styles.empty}>
              {q.trim() ? 'No matches.' : 'Search your captured messages by meaning or keywords.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <HitRow
            hit={item}
            c={c}
            onPress={() =>
              navigation.navigate('Thread', {
                conversationId: item.conversationId,
                aroundMessageId: item.messageId,
              })
            }
          />
        )}
      />
    </View>
  );
}

function HitRow({ hit, c, onPress }: { hit: ArchiveSearchHitDto; c: Palette; onPress: () => void }) {
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <View style={styles.hitHeader}>
        <Text style={styles.sender}>{hit.sender ?? 'Unknown'}</Text>
        <Text style={styles.when}>{new Date(hit.timestamp).toLocaleString()}</Text>
      </View>
      {hit.conversationTitle ? <Text style={styles.thread}>{hit.conversationTitle}</Text> : null}
      <Text style={styles.text} numberOfLines={4}>
        {hit.text}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    controls: { padding: spacing.lg, gap: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    grow: { flex: 1 },
    input: {
      ...t.body,
      backgroundColor: c.surface,
      borderRadius: radii.md,
      padding: spacing.sm,
      color: c.text,
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
    hitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sender: { ...t.body, fontWeight: '600' },
    when: { ...t.mono },
    thread: { ...t.hint },
    text: { ...t.small, color: c.text },
    empty: { ...t.small, textAlign: 'center', marginTop: spacing.lg },
    error: { ...t.small, color: c.danger, textAlign: 'center' },
    spinner: { marginTop: spacing.lg },
  });
};
