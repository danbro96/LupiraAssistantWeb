import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useDevice } from '../../state/device-store';
import { useCollector } from '../../state/collector-store';
import { useSyncStatus, refreshSyncStatus } from '../../sync/sync-status';
import { kickSync } from '../../sync/sync-engine';
import { useAuth } from '../../state/auth-store';
import { useInbox } from '../../state/inbox-store';
import { usePrefs } from '../../state/prefs-store';
import { launchConnect } from '../../data/auth/connect';
import { getDb } from '../../data/db/db';
import { Button } from '../components/Button';
import { useConfirm } from '../components/ConfirmDialog';
import { cardSurface, spacing, type Palette, useColors } from '../theme';
import { toast } from '../../feedback/toast';

type Styles = ReturnType<typeof makeStyles>;

export function SettingsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const debugEnabled = usePrefs((s) => s.debugEnabled);
  const confirm = useConfirm();

  const device = useDevice();
  const collector = useCollector();
  const status = useSyncStatus();
  const locationApiUrl = useAuth((s) => s.locationApiUrl);
  const healthApiUrl = useAuth((s) => s.healthApiUrl);
  const apiUrl = useAuth((s) => s.apiUrl);
  const grantStatus = useInbox((s) => s.grantStatus);
  const mirror = useSyncStatus((s) => s.mirror);

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


  async function onConnect() {
    setConnecting(true);
    const res = await launchConnect(apiUrl);
    if (res === 'returned') {
      await useInbox.getState().refreshGrant();
      toast('Assistant connection updated.');
    }
    setConnecting(false);
  }

  async function onReRegister() {
    const ok = await confirm({
      title: 'Re-register device?',
      message: 'This clears the local key and buffered fixes. You will register again.',
      confirmLabel: 'Re-register',
      destructive: true,
    });
    if (!ok) return;
    await useCollector.getState().stop();
    await useDevice.getState().clear();
    await useAuth.getState().clearSession();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>DEVICE</Text>
      <View style={styles.card}>
        <Row label="Label" value={device.label ?? '—'} styles={styles} />
        <Row label="Kind" value={device.kind ?? '—'} styles={styles} />
        <Row label="Record" value={device.recordSlug ?? '—'} styles={styles} />
        <Row label="Key id" value={device.keyId ?? '—'} styles={styles} mono />
      </View>

      <Text style={styles.section}>COLLECTION</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>Record location</Text>
          <Switch value={collector.collecting} onValueChange={(v) => void onToggleCollecting(v)} disabled={collector.starting} />
        </View>
        <Row label="Permission" value={collector.permissionStage} styles={styles} />
        {collector.permissionStage !== 'background' ? (
          <Text style={styles.warn}>Background ("Always") location is required to record while the app is closed.</Text>
        ) : null}
        {status.paused ? (
          <Text style={styles.warn}>Tracking is paused on the server{status.pausedReason ? ` (${status.pausedReason})` : ''}. Fixes are discarded until it resumes.</Text>
        ) : null}
      </View>

      <Text style={styles.section}>ASSISTANT</Text>
      <View style={styles.card}>
        <Row label="Grant" value={grantStatus} styles={styles} />
        <Button
          title={grantStatus === 'connected' ? 'Reconnect assistant' : 'Connect assistant'}
          variant="secondary"
          onPress={() => void onConnect()}
          loading={connecting}
          style={styles.btn}
        />
        <Button
          title="Notifications"
          variant="secondary"
          onPress={() => navigation.navigate('Preferences')}
          style={styles.btn}
        />
        <Button
          title="Sources"
          variant="secondary"
          onPress={() => navigation.navigate('Connectors')}
          style={styles.btn}
        />
      </View>

      <Text style={styles.section}>UPLOAD STATUS</Text>
      <View style={styles.card}>
        <Row label="Connectivity" value={status.online ? 'online' : 'offline'} styles={styles} />
        <Row label="Uploading" value={status.uploading ? 'yes' : 'no'} styles={styles} />
        <Row label="Buffered fixes" value={String(status.pendingCount)} styles={styles} mono />
        <Row label="Last uploaded seq" value={String(status.lastUploadedSeq)} styles={styles} mono />
        <Row label="Server high-water" value={status.highWaterSeq === null ? '—' : String(status.highWaterSeq)} styles={styles} mono />
        <Row label="Last upload" value={status.lastUploadAt ? new Date(status.lastUploadAt).toLocaleString() : 'never'} styles={styles} />
        {status.lastError ? <Text style={styles.error}>Last error: {status.lastError}</Text> : null}
        <Button title="Upload now" onPress={onUploadNow} style={styles.btn} />
      </View>

      <Text style={styles.section}>SERVERS</Text>
      <View style={styles.card}>
        <Row label="Assistant" value={apiUrl} styles={styles} />
        <Row label="Location" value={locationApiUrl} styles={styles} />
        <Row label="Health" value={healthApiUrl} styles={styles} />
        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>Enable debug</Text>
          <Switch value={debugEnabled} onValueChange={(v) => void usePrefs.getState().setDebugEnabled(v)} />
        </View>
        {debugEnabled ? (
          <Button title="Developer" variant="secondary" onPress={() => navigation.navigate('Developer')} style={styles.btn} />
        ) : null}
      </View>

      <Button title="Re-register device" variant="destructive" onPress={() => void onReRegister()} style={styles.btn} />
    </ScrollView>
  );
}

const Row = memo(function Row({
  label,
  value,
  styles,
  mono,
}: {
  label: string;
  value: string;
  styles: Styles;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={mono ? styles.infoValueMono : styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.sm },
    section: { fontSize: 12, fontWeight: '700', color: c.textSubtle, marginTop: spacing.md, marginBottom: spacing.xs },
    card: cardSurface(c),
    // Outlined fields carry a floating label on the border, so they need more air than info rows.
    serversCard: { gap: spacing.sm },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLabel: { fontSize: 16, color: c.text },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
    infoLabel: { fontSize: 13, color: c.textMuted },
    infoValue: { fontSize: 16, color: c.text, flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
    infoValueMono: { fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
    warn: { fontSize: 13, color: c.warning, marginTop: spacing.xs },
    error: { fontSize: 13, color: c.danger, marginTop: spacing.xs },
    btn: { marginTop: spacing.sm },
  });
