import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useInbox } from '../../state/inbox-store';
import {
  applyEdit,
  editSpecFor,
  fieldToInput,
  getField,
  inputToField,
  payloadSlotFor,
  visibleFields,
  type FieldSpec,
} from '@lupira/assistant-domain/edit-spec';
import { Button } from '../components/Button';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';
import { toast } from '../../feedback/toast';
import type { RootStackParamList } from '../navigation/types';

// Schema-driven editor: the field specs live in the domain package; this screen renders text inputs
// (booleans get a switch) over the proposal payload and submits the whole edited payload as an Edit
// resolution on the acks stream.

export function EditProposalScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EditProposal'>>();

  const item = useInbox((s) => s.items.find((i) => i.id === route.params.itemId));
  const slot = item?.proposal ? payloadSlotFor(item.proposal.actionKind) : null;
  const spec = item?.proposal ? editSpecFor(item.proposal.actionKind) : null;
  const initial = (slot && item?.proposal?.[slot]) || null;

  const [payload, setPayload] = useState<Record<string, unknown>>(() => ({ ...(initial ?? {}) }));
  // Raw text per field while typing; committed into the payload on save (after validation).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!item || !spec || !initial) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.empty}>This proposal is no longer editable.</Text>
      </View>
    );
  }

  const fields = visibleFields(spec, payload);
  const key = (f: FieldSpec) => f.path.join('.');

  function draftFor(f: FieldSpec): string {
    const k = key(f);
    return k in drafts ? drafts[k] : fieldToInput(f.type, getField(payload, f.path));
  }

  function onSave() {
    let next = payload;
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === 'boolean') continue;
      const k = key(f);
      if (!(k in drafts)) continue;
      const parsed = inputToField(f.type, drafts[k]);
      if (!parsed.ok) {
        errs[k] = parsed.error;
        continue;
      }
      next = applyEdit(next, f.path, parsed.value);
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    void useInbox.getState().resolve(item!.id, { action: 'Edit', edits: next });
    toast('Edit queued.');
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{item.title}</Text>
      {fields.map((f) => {
        const k = key(f);
        return (
          <View key={k} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            {f.type === 'boolean' ? (
              <Switch
                value={getField(payload, f.path) === true}
                onValueChange={(v) => setPayload((p) => applyEdit(p, f.path, v))}
              />
            ) : (
              <TextInput
                style={[styles.input, f.type === 'multiline' && styles.multiline]}
                value={draftFor(f)}
                onChangeText={(t) => setDrafts((d) => ({ ...d, [k]: t }))}
                multiline={f.type === 'multiline'}
                autoCapitalize="none"
                placeholderTextColor={c.textMuted}
              />
            )}
            {errors[k] ? <Text style={styles.error}>{errors[k]}</Text> : null}
          </View>
        );
      })}
      <Button title="Save & approve" onPress={onSave} style={styles.save} />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: spacing.lg, gap: spacing.sm },
    title: { ...t.body, fontWeight: '600', marginBottom: spacing.xs },
    field: { gap: spacing.xs },
    label: { ...t.sectionLabel },
    input: {
      ...t.body,
      backgroundColor: c.surface,
      borderRadius: radii.md,
      padding: spacing.sm,
      color: c.text,
    },
    multiline: { minHeight: 72, textAlignVertical: 'top' },
    error: { ...t.small, color: c.danger },
    empty: { ...t.body },
    save: { marginTop: spacing.md },
  });
};
