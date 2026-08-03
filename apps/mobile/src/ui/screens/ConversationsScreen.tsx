import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useArchive } from '../../state/archive-store';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';
import type { RootStackParamList } from '../navigation/types';

// The thread list: every captured conversation, newest activity first, cursor-paged.

export function ConversationsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const conversations = useArchive((s) => s.conversations);
  const loading = useArchive((s) => s.loadingConversations);
  const cursor = useArchive((s) => s.conversationsCursor);
  const [q, setQ] = useState('');

  useEffect(() => {
    void useArchive.getState().loadConversations();
  }, []);

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.input}
        value={q}
        onChangeText={setQ}
        placeholder="Filter by title…"
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={() => void useArchive.getState().loadConversations({ q: q.trim() || undefined })}
      />
      <FlatList
        data={conversations}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.list}
        refreshing={loading && conversations.length === 0}
        onRefresh={() => void useArchive.getState().loadConversations({ q: q.trim() || undefined })}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (cursor) void useArchive.getState().loadConversations({ more: true, q: q.trim() || undefined });
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={c.primary} style={styles.spinner} />
          ) : (
            <Text style={styles.empty}>No conversations captured yet.</Text>
          )
        }
        ListFooterComponent={
          loading && conversations.length > 0 ? <ActivityIndicator color={c.primary} style={styles.spinner} /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            accessibilityRole="button"
            onPress={() => navigation.navigate('Thread', { conversationId: item.id })}
          >
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title ?? 'Untitled thread'}
              </Text>
              <Text style={styles.when}>{new Date(item.lastMessageAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.meta}>
              {item.source} · {item.messageCount} message{item.messageCount === 1 ? '' : 's'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    input: {
      ...t.body,
      backgroundColor: c.surface,
      borderRadius: radii.md,
      padding: spacing.sm,
      margin: spacing.lg,
      marginBottom: spacing.sm,
      color: c.text,
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { ...t.body, fontWeight: '600', flexShrink: 1 },
    when: { ...t.mono },
    meta: { ...t.hint },
    empty: { ...t.small, textAlign: 'center', marginTop: spacing.lg },
    spinner: { marginVertical: spacing.md },
  });
};
