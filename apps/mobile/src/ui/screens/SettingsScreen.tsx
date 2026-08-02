import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useDevice } from '../../state/device-store';
import { useCollector } from '../../state/collector-store';
import { useSyncStatus, refreshSyncStatus } from '../../sync/sync-status';
import { kickSync } from '../../sync/sync-engine';
import { useAuth } from '../../state/auth-store';
import { useInbox } from '../../state/inbox-store';
import { launchConnect } from '../../data/auth/connect';
import { getDb } from '../../data/db/db';
import { Button } from '../components/Button';
import { makeType, radii, spacing, useColors, type Palette } from '../theme';
import { toast } from '../../feedback/toast';

export function SettingsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const device = useDevice();
  const collector = useCollector();
  const status = useSyncStatus();
  const locationApiUrl = useAuth((s) => s.locationApiUrl);
  const healthApiUrl = useAuth((s) => s.healthApiUrl);
  const assistantApiUrl = useAuth((s) => s.assistantApiUrl);
  const grantStatus = useInbox((s) => s.grantStatus);
  const mirror = useSyncStatus((s) => s.mirror);

  const [locationUrlDraft, setLocationUrlDraft] = useState(locationApiUrl);
  const [healthUrlDraft, setHealthUrlDraft] = useState(healthApiUrl);
  const [assistantUrlDraft, setAssistantUrlDraft] = useState(assistantApiUrl);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!device.deviceId) return;
    const db = await getDb();
    await refreshSyncStatus(db, device.deviceId);
  }, [device.deviceId]);

  useEffect(() => {
    void collector.hydrate();
    void collector.refreshPermissions();
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
  }, [mirror, refresh]);

  async function onToggleCollecting(next: boolean) {
    if (next) {
      const res = await useCollector.getState().start();
      if (!res.ok) {
        toast(
          res.stage === 'foreground'
            ? 'Enable "Always" location in Settings to record in the background.'
            : 'Location permission is required to collect.',
        );
      }
    } else {
      await useCollector.getState().stop();
    }
    await refresh();
  }

  function onUploadNow() {
    void (async () => {
      await kickSync({ resume: true, poll: true });
      await refresh();
      toast('Upload triggered.');
    })();
  }

  async function onSaveUrls() {
    await Promise.all([
      useAuth.getState().setLocationApiUrl(locationUrlDraft.trim()),
      useAuth.getState().setHealthApiUrl(healthUrlDraft.trim()),
      useAuth.getState().setAssistantApiUrl(assistantUrlDraft.trim()),
    ]);
    toast('Server URLs saved.');
  }

  async function onConnect() {
    setConnecting(true);
    const res = await launchConnect(assistantApiUrl);
    if (res === 'returned') {
      await useInbox.getState().refreshGrant();
      toast('Assistant connection updated.');
    }
    setConnecting(false);
  }

  function onReRegister() {
    Alert.alert('Re-register device?', 'This clears the local key and buffered fixes. You will register again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Re-register',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await useCollector.getState().stop();
            await useDevice.getState().clear();
            await useAuth.getState().clearSession();
          })();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>DEVICE</Text>
      <View style={styles.card}>
        <Row label="Label" value={device.label ?? '—'} c={c} />
        <Row label="Kind" value={device.kind ?? '—'} c={c} />
        <Row label="Record" value={device.recordSlug ?? '—'} c={c} />
        <Row label="Key id" value={device.keyId ?? '—'} c={c} mono />
      </View>

      <Text style={styles.section}>COLLECTION</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>Record location</Text>
          <Switch value={collector.collecting} onValueChange={(v) => void onToggleCollecting(v)} disabled={collector.starting} />
        </View>
        <Row label="Permission" value={collector.permissionStage} c={c} />
        {collector.permissionStage !== 'background' ? (
          <Text style={styles.warn}>Background ("Always") location is required to record while the app is closed.</Text>
        ) : null}
        {status.paused ? (
          <Text style={styles.warn}>Tracking is paused on the server{status.pausedReason ? ` (${status.pausedReason})` : ''}. Fixes are discarded until it resumes.</Text>
        ) : null}
      </View>

      <Text style={styles.section}>ASSISTANT</Text>
      <View style={styles.card}>
        <Row label="Grant" value={grantStatus} c={c} />
        <Button
          title={grantStatus === 'connected' ? 'Reconnect assistant' : 'Connect assistant'}
          variant="secondary"
          onPress={() => void onConnect()}
          loading={connecting}
          style={styles.btn}
        />
      </View>

      <Text style={styles.section}>UPLOAD STATUS</Text>
      <View style={styles.card}>
        <Row label="Connectivity" value={status.online ? 'online' : 'offline'} c={c} />
        <Row label="Uploading" value={status.uploading ? 'yes' : 'no'} c={c} />
        <Row label="Buffered fixes" value={String(status.pendingCount)} c={c} mono />
        <Row label="Last uploaded seq" value={String(status.lastUploadedSeq)} c={c} mono />
        <Row label="Server high-water" value={status.highWaterSeq === null ? '—' : String(status.highWaterSeq)} c={c} mono />
        <Row label="Last upload" value={status.lastUploadAt ? new Date(status.lastUploadAt).toLocaleString() : 'never'} c={c} />
        {status.lastError ? <Text style={styles.error}>Last error: {status.lastError}</Text> : null}
        <Button title="Upload now" onPress={onUploadNow} style={styles.btn} />
      </View>

      <Text style={styles.section}>SERVERS</Text>
      <View style={styles.card}>
        <Text style={styles.rowLabel}>Location API URL</Text>
        <TextInput
          value={locationUrlDraft}
          onChangeText={setLocationUrlDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          placeholderTextColor={c.textSubtle}
        />
        <Text style={[styles.rowLabel, { marginTop: spacing.sm }]}>Health API URL</Text>
        <TextInput
          value={healthUrlDraft}
          onChangeText={setHealthUrlDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          placeholderTextColor={c.textSubtle}
        />
        <Text style={[styles.rowLabel, { marginTop: spacing.sm }]}>Assistant API URL</Text>
        <TextInput
          value={assistantUrlDraft}
          onChangeText={setAssistantUrlDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          placeholderTextColor={c.textSubtle}
        />
        <Button title="Save URLs" variant="secondary" onPress={() => void onSaveUrls()} style={styles.btn} />
      </View>

      <Button title="Re-register device" variant="destructive" onPress={onReRegister} style={styles.btn} />
    </ScrollView>
  );
}

function Row({ label, value, c, mono }: { label: string; value: string; c: Palette; mono?: boolean }) {
  const t = makeType(c);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text style={{ ...t.small }}>{label}</Text>
      <Text style={[mono ? t.mono : t.body, { flexShrink: 1, textAlign: 'right', marginLeft: spacing.md }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const t = makeType(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.sm },
    section: { ...t.sectionLabel, marginTop: spacing.md, marginBottom: spacing.xs },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLabel: { ...t.body },
    warn: { ...t.small, color: c.warning, marginTop: spacing.xs },
    error: { ...t.small, color: c.danger, marginTop: spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: c.text,
      fontSize: 15,
      marginTop: spacing.xs,
    },
    btn: { marginTop: spacing.sm },
  });
};
