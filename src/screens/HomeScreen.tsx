import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';
import type { AppSettings } from '../types';

type PermStatus = 'granted' | 'denied' | 'unknown';

const NEEDS_NOTIF = Platform.OS === 'android' && (Platform.Version as number) >= 33;

async function checkPerms() {
  const camera = (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA))
    ? 'granted' : 'denied';
  const location = (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION))
    ? 'granted' : 'denied';
  let notification: PermStatus = 'granted';
  if (NEEDS_NOTIF) {
    notification = (await PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS' as any))
      ? 'granted' : 'denied';
  }
  return { camera, location, notification } as Record<string, PermStatus>;
}

export function HomeScreen() {
  const [adminActive, setAdminActive] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logCount, setLogCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [perms, setPerms] = useState<Record<string, PermStatus>>({
    camera: 'unknown', location: 'unknown', notification: 'granted',
  });

  const load = useCallback(async () => {
    try {
      const [admin, s, logs, p] = await Promise.all([
        TheftTrack.isDeviceAdminActive(),
        TheftTrack.getSettings(),
        TheftTrack.getIntrusionLogs(),
        checkPerms(),
      ]);
      setAdminActive(admin);
      setSettings(s);
      setLogCount(logs.length);
      setPerms(p);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const requestPerm = async (key: string) => {
    let perm: string;
    let rationale: { title: string; message: string; buttonPositive: string; buttonNegative: string };
    switch (key) {
      case 'camera':
        perm = PermissionsAndroid.PERMISSIONS.CAMERA;
        rationale = {
          title: 'Camera Permission',
          message: 'TheftTrack needs camera access to silently photograph intruders.',
          buttonPositive: 'Grant',
          buttonNegative: 'Deny',
        };
        break;
      case 'location':
        perm = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
        rationale = {
          title: 'Location Permission',
          message: 'TheftTrack needs location access to record where intrusions happened.',
          buttonPositive: 'Grant',
          buttonNegative: 'Deny',
        };
        break;
      case 'notification':
        perm = 'android.permission.POST_NOTIFICATIONS';
        rationale = {
          title: 'Notification Permission',
          message: 'TheftTrack needs notifications to alert you of intrusion events.',
          buttonPositive: 'Grant',
          buttonNegative: 'Deny',
        };
        break;
      default:
        return;
    }
    const result = await PermissionsAndroid.request(perm as any, rationale);
    setPerms(p => ({
      ...p,
      [key]: result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
    }));
  };

  const toggleProtection = async (value: boolean) => {
    if (!adminActive && value) {
      Alert.alert(
        'Device Admin Required',
        'TheftTrack needs Device Administrator access to detect failed unlock attempts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Access', onPress: () => TheftTrack.requestDeviceAdmin() },
        ]
      );
      return;
    }
    if (!settings) return;
    try {
      await TheftTrack.saveSettings(
        settings.email, settings.password, settings.recipient,
        settings.threshold, value
      );
      setSettings({ ...settings, enabled: value });
    } catch {
      Alert.alert('Error', 'Could not update protection status.');
    }
  };

  const missingPerms = Object.entries(perms).filter(
    ([key, val]) => val !== 'granted' && (key !== 'notification' || NEEDS_NOTIF)
  );
  const isProtected = adminActive && !!settings?.enabled;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      {/* Shield */}
      <View style={[styles.shield, isProtected ? styles.shieldOn : styles.shieldOff]}>
        <Text style={styles.shieldIcon}>{isProtected ? '🔒' : '🔓'}</Text>
        <Text style={styles.shieldLabel}>{isProtected ? 'PROTECTED' : 'NOT PROTECTED'}</Text>
      </View>

      {/* Enable toggle */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.cardTitle}>Theft Protection</Text>
            <Text style={styles.cardSub}>
              {settings?.enabled
                ? `Triggers after ${settings.threshold} failed attempt${settings.threshold !== 1 ? 's' : ''}`
                : 'Enable to start monitoring'}
            </Text>
          </View>
          <Switch
            value={!!settings?.enabled}
            onValueChange={toggleProtection}
            trackColor={{ false: '#555', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Device Admin */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Admin</Text>
        <StatusRow
          ok={adminActive}
          okText="Active — monitoring unlock failures"
          failText="Not granted"
        />
        {!adminActive && (
          <TouchableOpacity style={styles.grantBtn} onPress={() => TheftTrack.requestDeviceAdmin()}>
            <Text style={styles.grantBtnText}>Grant Device Admin</Text>
          </TouchableOpacity>
        )}
        {adminActive && (
          <TouchableOpacity
            style={[styles.grantBtn, styles.grantBtnDanger]}
            onPress={() =>
              Alert.alert('Remove Device Admin', 'This will disable protection. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: async () => { await TheftTrack.removeDeviceAdmin(); load(); } },
              ])
            }
          >
            <Text style={styles.grantBtnText}>Remove Device Admin</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Permissions — only shown when something is missing */}
      {missingPerms.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Permissions Needed</Text>
          {missingPerms.map(([key]) => {
            const meta: Record<string, { icon: string; label: string }> = {
              camera:       { icon: '📷', label: 'Camera' },
              location:     { icon: '📍', label: 'Location' },
              notification: { icon: '🔔', label: 'Notifications' },
            };
            const { icon, label } = meta[key] ?? { icon: '❓', label: key };
            return (
              <View key={key} style={styles.permRow}>
                <Text style={styles.permIcon}>{icon}</Text>
                <Text style={styles.permLabel}>{label}</Text>
                <TouchableOpacity style={styles.grantSmallBtn} onPress={() => requestPerm(key)}>
                  <Text style={styles.grantSmallText}>Grant</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{logCount}</Text>
            <Text style={styles.statLabel}>Total Intrusions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{settings?.threshold ?? 3}</Text>
            <Text style={styles.statLabel}>Attempt Threshold</Text>
          </View>
        </View>
      </View>

      {/* How it works */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          {'1. Enable theft protection and grant Device Admin\n'}
          {'2. Configure your alert email in Settings\n'}
          {'3. When unlock attempts reach the threshold:\n'}
          {'   • Front & back camera photos are captured\n'}
          {'   • GPS location is recorded\n'}
          {'   • Photos + location are emailed to you\n'}
          {'   • Event is logged in the Logs tab'}
        </Text>
      </View>
    </ScrollView>
  );
}

function StatusRow({ ok, okText, failText }: { ok: boolean; okText: string; failText: string }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, ok ? styles.dotGreen : styles.dotRed]} />
      <Text style={styles.statusText}>{ok ? okText : failText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 32 },
  shield: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 120,
    width: 180,
    height: 180,
    alignSelf: 'center',
    marginVertical: 20,
  },
  shieldOn: { backgroundColor: '#1B5E20' },
  shieldOff: { backgroundColor: '#7f1d1d' },
  shieldIcon: { fontSize: 56 },
  shieldLabel: {
    color: '#fff', fontWeight: 'bold', fontSize: 12,
    marginTop: 8, letterSpacing: 2,
  },
  card: {
    backgroundColor: '#1E1E1E', borderRadius: 12,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardSub: { color: '#888', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flex: 1, marginRight: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#F44336' },
  statusText: { color: '#ccc', fontSize: 14 },
  grantBtn: {
    backgroundColor: '#1565C0', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', marginTop: 4,
  },
  grantBtnDanger: { backgroundColor: '#B71C1C' },
  grantBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  permRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8,
  },
  permIcon: { fontSize: 18, marginRight: 10 },
  permLabel: { color: '#ccc', fontSize: 14, flex: 1 },
  grantSmallBtn: {
    backgroundColor: '#1565C0', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  grantSmallText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  stat: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  infoText: { color: '#aaa', fontSize: 13, lineHeight: 22 },
});
