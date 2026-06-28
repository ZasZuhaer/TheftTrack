import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
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

const PHOTO_STEP = 130; // 120px width + 10px gap

function LogCard({ log }: { log: IntrusionLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasLocation = log.latitude !== 0 || log.longitude !== 0;
  const totalPhotos = log.frontPhotos.length + log.backPhotos.length;

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const containerW = useRef(0);
  const contentW = useRef(0);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(totalPhotos > 1);

  const updateArrows = (x: number) => {
    setShowLeft(x > 1);
    setShowRight(x + containerW.current < contentW.current - 1);
  };

  useEffect(() => {
    if (!expanded) {
      scrollX.current = 0;
      setShowLeft(false);
      setShowRight(totalPhotos > 1);
    }
  }, [expanded, totalPhotos]);

  const pressLeft = () => {
    const next = Math.max(0, scrollX.current - PHOTO_STEP);
    scrollRef.current?.scrollTo({ x: next, animated: true });
  };

  const pressRight = () => {
    scrollRef.current?.scrollTo({ x: scrollX.current + PHOTO_STEP, animated: true });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.85}
      >
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
          {!!log.videoPath && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <Text style={styles.badgeText}>Video</Text>
            </View>
          )}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expanded}>
          {/* Photos */}
          {log.frontPhotos.length === 0 && log.backPhotos.length === 0 ? (
            <Text style={[styles.noPhoto, { marginBottom: 12 }]}>No photos captured</Text>
          ) : (
            <View style={styles.photoScrollWrapper}>
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                contentContainerStyle={styles.photoScrollContent}
                onScroll={e => {
                  scrollX.current = e.nativeEvent.contentOffset.x;
                  updateArrows(scrollX.current);
                }}
                onLayout={e => {
                  containerW.current = e.nativeEvent.layout.width;
                  updateArrows(scrollX.current);
                }}
                onContentSizeChange={w => {
                  contentW.current = w;
                  updateArrows(scrollX.current);
                }}
              >
                {log.frontPhotos.map((path, i) => (
                  <View key={`front_${i}`} style={styles.photoContainer}>
                    <Image
                      source={{ uri: `file://${path}` }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    <Text style={styles.photoLabel}>
                      Front{log.frontPhotos.length > 1 ? ` ${i + 1}` : ''}
                    </Text>
                  </View>
                ))}
                {log.backPhotos.map((path, i) => (
                  <View key={`back_${i}`} style={styles.photoContainer}>
                    <Image
                      source={{ uri: `file://${path}` }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    <Text style={styles.photoLabel}>
                      Back{log.backPhotos.length > 1 ? ` ${i + 1}` : ''}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              {showLeft && (
                <TouchableOpacity style={[styles.scrollBtn, styles.scrollBtnLeft]} onPress={pressLeft}>
                  <Text style={styles.scrollBtnText}>‹</Text>
                </TouchableOpacity>
              )}
              {showRight && (
                <TouchableOpacity style={[styles.scrollBtn, styles.scrollBtnRight]} onPress={pressRight}>
                  <Text style={styles.scrollBtnText}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Video */}
          {!!log.videoPath && (
            <TouchableOpacity
              style={styles.videoBtn}
              onPress={() => TheftTrack.openVideoFile(log.videoPath)}
            >
              <Text style={styles.videoBtnText}>▶  Play Captured Video</Text>
            </TouchableOpacity>
          )}

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
    </View>
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
  badgeBlue: { backgroundColor: '#0D47A1' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  chevron: { color: '#666', marginLeft: 8 },
  expanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 },
  photoScrollWrapper: { marginBottom: 12 },
  photoScrollContent: { gap: 10, paddingHorizontal: 2 },
  scrollBtn: {
    position: 'absolute',
    top: 46,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBtnLeft: { left: 4 },
  scrollBtnRight: { right: 4 },
  scrollBtnText: { color: '#fff', fontSize: 20, lineHeight: 22, marginTop: -1 },
  photoContainer: { width: 120, alignItems: 'center' },
  photo: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#333' },
  photoLabel: { color: '#888', fontSize: 11, marginTop: 4 },
  noPhoto: { color: '#666', fontSize: 13 },
  videoBtn: {
    backgroundColor: '#1A237E',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  videoBtnText: { color: '#90CAF9', fontSize: 13, fontWeight: '600' },
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
