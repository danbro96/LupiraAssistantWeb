import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { useSettings } from '../../state/settings-store';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
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
          <TextField style={styles.grow} label="From" placeholder="22:00" value={start} onChangeText={setStart} />
          <TextField style={styles.grow} label="To" placeholder="07:00" value={end} onChangeText={setEnd} />
        </View>
        <TextField
          label="Time zone"
          placeholder="Europe/Stockholm"
          value={zone}
          onChangeText={setZone}
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
    save: { marginTop: spacing.md },
  });
};
