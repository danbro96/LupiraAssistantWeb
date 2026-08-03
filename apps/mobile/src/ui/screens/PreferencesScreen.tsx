import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSettings } from '../../state/settings-store';
import { Button } from '../components/Button';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';
import { toast } from '../../feedback/toast';

// Delivery preferences: how the assistant may interrupt. Quiet hours hold back the push only — items
// still land in the inbox, so nothing is lost while you sleep.

export function PreferencesScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const preferences = useSettings((s) => s.preferences);
  const saving = useSettings((s) => s.savingPreferences);

  const [digest, setDigest] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [zone, setZone] = useState('');

  useEffect(() => {
    void useSettings.getState().loadPreferences();
  }, []);

  // Seed the form once the server state arrives.
  useEffect(() => {
    if (!preferences) return;
    setDigest(preferences.mode === 'Digest');
    setStart(preferences.quietHoursStart ?? '');
    setEnd(preferences.quietHoursEnd ?? '');
    setZone(preferences.timeZone ?? '');
  }, [preferences]);

  async function onSave() {
    const okSaved = await useSettings.getState().savePreferences({
      mode: digest ? 'Digest' : 'PerItem',
      quietHoursStart: start.trim() || undefined,
      quietHoursEnd: end.trim() || undefined,
      timeZone: zone.trim() || undefined,
    });
    toast(okSaved ? 'Preferences saved.' : 'Could not save preferences.');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Batch into a digest</Text>
            <Text style={styles.hint}>Off = notify me per item.</Text>
          </View>
          <Switch value={digest} onValueChange={setDigest} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>QUIET HOURS</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          Notifications stay silent inside this window; items still arrive in the inbox. Leave blank for none.
        </Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.grow]}
            value={start}
            onChangeText={setStart}
            placeholder="22:00"
            placeholderTextColor={c.textMuted}
          />
          <Text style={styles.to}>to</Text>
          <TextInput
            style={[styles.input, styles.grow]}
            value={end}
            onChangeText={setEnd}
            placeholder="07:00"
            placeholderTextColor={c.textMuted}
          />
        </View>
        <TextInput
          style={styles.input}
          value={zone}
          onChangeText={setZone}
          placeholder="Europe/Stockholm"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
        />
      </View>

      <Button title="Save" onPress={() => void onSave()} loading={saving} style={styles.save} />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.sm },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    rowText: { flex: 1, gap: 2 },
    grow: { flex: 1 },
    label: { ...t.body },
    hint: { ...t.small },
    sectionLabel: { ...t.sectionLabel, marginTop: spacing.md },
    to: { ...t.small },
    input: {
      ...t.body,
      backgroundColor: c.bg,
      borderRadius: radii.md,
      padding: spacing.sm,
      color: c.text,
    },
    save: { marginTop: spacing.md },
  });
};
