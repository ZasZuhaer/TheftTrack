import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
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

export function HomeScreen() {
  const [adminActive, setAdminActive] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logCount, setLogCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [admin, s, logs] = await Promise.all([
        TheftTrack.isDeviceAdminActive(),
        TheftTrack.getSettings(),
        TheftTrack.getIntrusionLogs(),
      ]);
      setAdminActive(admin);
      setSettings(s);
      setLogCount(logs.length);
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

  const toggleProtection = async (value: boolean) => {
    if (!adminActive && value) {
      Alert.alert(
        'Device Admin Required',
        'TheftTrack needs Device Administrator access to detect failed unlock attempts. You will be prompted to grant it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Access',
            onPress: () => TheftTrack.requestDeviceAdmin(),
          },
        ]
      );
      return;
    }
    if (!settings) return;
    try {
      await TheftTrack.saveSettings(
        settings.email,
        settings.password,
        settings.recipient,
        settings.threshold,
        value
      );
      setSettings({ ...settings, enabled: value });
    } catch (e) {
      Alert.alert('Error', 'Could not update protection status.');
    }
  };

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
      <View style={[styles.shieldContainer, isProtected ? styles.shieldOn : styles.shieldOff]}>
        <Text style={styles.shieldIcon}>{isProtected ? '🔒' : '🔓'}</Text>
        <Text style={styles.shieldLabel}>
          {isProtected ? 'PROTECTED' : 'NOT PROTECTED'}
        </Text>
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

      {/* Device Admin status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Admin</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, adminActive ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusText}>
            {adminActive ? 'Active — monitoring unlock failures' : 'Not granted'}
          </Text>
        </View>
        {!adminActive && (
          <TouchableOpacity
            style={styles.btn}
            onPress={() => TheftTrack.requestDeviceAdmin()}
          >
            <Text style={styles.btnText}>Grant Device Admin</Text>
          </TouchableOpacity>
        )}
        {adminActive && (
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={() =>
              Alert.alert(
                'Remove Device Admin',
                'This will disable protection. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      await TheftTrack.removeDeviceAdmin();
                      load();
                    },
                  },
                ]
              )
            }
          >
            <Text style={styles.btnText}>Remove Device Admin</Text>
          </TouchableOpacity>
        )}
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 32 },
  shieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 120,
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 24,
  },
  shieldOn: { backgroundColor: '#1B5E20' },
  shieldOff: { backgroundColor: '#7f1d1d' },
  shieldIcon: { fontSize: 64 },
  shieldLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardSub: { color: '#888', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flex: 1, marginRight: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#F44336' },
  statusText: { color: '#ccc', fontSize: 14 },
  btn: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDanger: { backgroundColor: '#B71C1C' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  stat: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  infoText: { color: '#aaa', fontSize: 13, lineHeight: 22 },
});
