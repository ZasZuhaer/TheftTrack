import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';

const THRESHOLDS = [1, 2, 3, 4, 5];

export function SettingsFailedAttemptsScreen() {
  const [threshold, setThreshold] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    TheftTrack.getSettings().then(s => setThreshold(s.threshold));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const current = await TheftTrack.getSettings();
      await TheftTrack.saveSettings(current.email, current.password, current.recipient, threshold, current.enabled);
      Alert.alert('Saved', 'Threshold updated.');
    } catch {
      Alert.alert('Error', 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.desc}>
        Trigger an intrusion capture after this many consecutive failed unlock attempts.
      </Text>
      <View style={styles.grid}>
        {THRESHOLDS.map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.btn, threshold === n && styles.btnActive]}
            onPress={() => setThreshold(n)}
          >
            <Text style={[styles.btnNum, threshold === n && styles.btnNumActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.selected}>
        {threshold} failed attempt{threshold !== 1 ? 's' : ''} will trigger a capture
      </Text>
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  desc: { color: '#aaa', fontSize: 14, lineHeight: 20, marginBottom: 28 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: { backgroundColor: '#1565C0' },
  btnNum: { color: '#888', fontSize: 22, fontWeight: '600' },
  btnNumActive: { color: '#fff' },
  selected: { color: '#888', fontSize: 13, marginBottom: 32, textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
