import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';
import type { IntrusionLog } from '../types';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

function LogCard({ log }: { log: IntrusionLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasLocation = log.latitude !== 0 || log.longitude !== 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardDate}>{formatDate(log.timestamp)}</Text>
          <Text style={styles.cardAttempts}>
            {log.failedAttempts} failed attempt{log.failedAttempts !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.badges}>
          {log.emailSent && (
            <View style={[styles.badge, styles.badgeGreen]}>
              <Text style={styles.badgeText}>Email Sent</Text>
            </View>
          )}
          {!log.emailSent && (
            <View style={[styles.badge, styles.badgeOrange]}>
              <Text style={styles.badgeText}>No Email</Text>
            </View>
          )}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          {/* Photos */}
          <View style={styles.photoRow}>
            {!!log.frontPhoto && (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: `file://${log.frontPhoto}` }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <Text style={styles.photoLabel}>Front Camera</Text>
              </View>
            )}
            {!!log.backPhoto && (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: `file://${log.backPhoto}` }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <Text style={styles.photoLabel}>Back Camera</Text>
              </View>
            )}
            {!log.frontPhoto && !log.backPhoto && (
              <Text style={styles.noPhoto}>No photos captured</Text>
            )}
          </View>

          {/* Location */}
          {hasLocation ? (
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={() =>
                Linking.openURL(
                  `https://maps.google.com/?q=${log.latitude},${log.longitude}`
                )
              }
            >
              <Text style={styles.locationText}>
                📍 {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
              </Text>
              <Text style={styles.locationSub}>Tap to open in Maps</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noLocation}>Location unavailable</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function LogsScreen() {
  const [logs, setLogs] = useState<IntrusionLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await TheftTrack.getIntrusionLogs();
      setLogs(data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const clearAll = () =>
    Alert.alert('Clear All Logs', 'This also deletes saved photos. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await TheftTrack.clearIntrusionLogs();
          setLogs([]);
        },
      },
    ]);

  return (
    <View style={styles.container}>
      {logs.length > 0 && (
        <View style={styles.topBar}>
          <Text style={styles.topBarText}>{logs.length} intrusion{logs.length !== 1 ? 's' : ''} recorded</Text>
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearBtn}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <LogCard log={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No intrusions detected</Text>
            <Text style={styles.emptySub}>
              Logs will appear here when failed unlock attempts trigger the threshold.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  topBarText: { color: '#aaa', fontSize: 13 },
  clearBtn: { color: '#F44336', fontWeight: '600', fontSize: 14 },
  list: { padding: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardAttempts: { color: '#F44336', fontSize: 12, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGreen: { backgroundColor: '#1B5E20' },
  badgeOrange: { backgroundColor: '#5D4037' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  chevron: { color: '#666', marginLeft: 8 },
  expanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoContainer: { flex: 1, alignItems: 'center' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#333' },
  photoLabel: { color: '#888', fontSize: 11, marginTop: 4 },
  noPhoto: { color: '#666', fontSize: 13 },
  locationBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    padding: 10,
  },
  locationText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  locationSub: { color: '#90CAF9', fontSize: 11, marginTop: 2 },
  noLocation: { color: '#666', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
