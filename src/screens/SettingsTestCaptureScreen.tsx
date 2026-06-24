import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';

export function SettingsTestCaptureScreen() {
  const [testing, setTesting] = useState(false);

  const testCapture = async () => {
    setTesting(true);
    try {
      await TheftTrack.triggerTestCapture();
      Alert.alert(
        'Test Triggered',
        'Capturing photos and location now. Check the Logs tab in a few seconds. An email will be sent if configured.'
      );
    } catch {
      Alert.alert('Error', 'Could not trigger test capture. Make sure camera and location permissions are granted.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What gets captured</Text>
        <Text style={styles.info}>
          {'• Front-facing camera photo\n• Rear camera photo\n• GPS coordinates (if location is enabled)'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Capture</Text>
        <Text style={styles.hint}>
          Manually trigger a capture to verify that camera, location, and email are all working correctly.
        </Text>
        <TouchableOpacity
          style={[styles.btn, testing && styles.btnDisabled]}
          onPress={testCapture}
          disabled={testing}
        >
          <Text style={styles.btnText}>{testing ? 'Triggering…' : 'Test Capture Now'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  info: { color: '#aaa', fontSize: 14, lineHeight: 24 },
  hint: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  btn: {
    backgroundColor: '#4A148C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
