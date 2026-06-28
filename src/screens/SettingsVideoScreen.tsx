import React, { useCallback, useState } from 'react';
import {
  AppState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TheftTrack } from '../utils/NativeTheftTrack';

export function SettingsVideoScreen() {
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoDuration, setVideoDuration] = useState(5);

  const load = useCallback(async () => {
    const s = await TheftTrack.getSettings();
    setVideoEnabled(s.videoEnabled);
    setVideoDuration(s.videoDuration);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = AppState.addEventListener('change', state => {
        if (state === 'active') load();
      });
      return () => sub.remove();
    }, [load])
  );

  const save = (enabled: boolean, duration: number) => {
    TheftTrack.saveVideoSettings(enabled, duration);
  };

  const toggleEnabled = (val: boolean) => {
    setVideoEnabled(val);
    save(val, videoDuration);
  };

  const changeDuration = (delta: number) => {
    const next = Math.min(60, Math.max(5, videoDuration + delta));
    setVideoDuration(next);
    save(videoEnabled, next);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>VIDEO CAPTURE</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Enable Video Capture</Text>
            <Text style={styles.rowDesc}>Record from front camera during detection</Text>
          </View>
          <Switch
            value={videoEnabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: '#555', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>DURATION</Text>
      <View style={[styles.card, !videoEnabled && styles.cardDisabled]}>
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, !videoEnabled && styles.textDisabled]}>Video Length</Text>
            <Text style={[styles.rowDesc, !videoEnabled && styles.textDisabled]}>
              How many seconds to record
            </Text>
          </View>
          <View style={styles.counter}>
            <TouchableOpacity
              style={[styles.counterBtn, (videoDuration <= 5 || !videoEnabled) && styles.counterBtnDisabled]}
              onPress={() => changeDuration(-5)}
              disabled={videoDuration <= 5 || !videoEnabled}
              activeOpacity={0.6}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.counterValue, !videoEnabled && styles.textDisabled]}>
              {videoDuration}s
            </Text>
            <TouchableOpacity
              style={[styles.counterBtn, (videoDuration >= 60 || !videoEnabled) && styles.counterBtnDisabled]}
              onPress={() => changeDuration(5)}
              disabled={videoDuration >= 60 || !videoEnabled}
              activeOpacity={0.6}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.hint}>
        Video is captured silently from the front camera. No audio is recorded.
        Files are attached to the alert email and stored with the intrusion log.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardDisabled: { opacity: 0.45 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowContent: { flex: 1, marginRight: 12 },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  rowDesc: { color: '#888', fontSize: 12, marginTop: 2, lineHeight: 17 },
  textDisabled: { color: '#555' },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: { opacity: 0.35 },
  counterBtnText: { color: '#fff', fontSize: 20, lineHeight: 24 },
  counterValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'center',
  },
  hint: {
    color: '#555',
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 4,
    marginTop: -12,
  },
});
