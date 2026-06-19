import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';
import type { AppSettings } from '../types';

const THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function SettingsScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recipient, setRecipient] = useState('');
  const [threshold, setThreshold] = useState(3);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const s: AppSettings = await TheftTrack.getSettings();
      setEmail(s.email);
      setPassword(s.password);
      setRecipient(s.recipient);
      setThreshold(s.threshold);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!email || !password || !recipient) {
      Alert.alert('Missing Fields', 'Please fill in all email fields before saving.');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email) || !emailRe.test(recipient)) {
      Alert.alert('Invalid Email', 'Please enter valid email addresses.');
      return;
    }
    setSaving(true);
    try {
      const current = await TheftTrack.getSettings();
      await TheftTrack.saveSettings(email, password, recipient, threshold, current.enabled);
      Alert.alert('Saved', 'Settings saved successfully.');
    } catch {
      Alert.alert('Error', 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const testCapture = async () => {
    setTesting(true);
    try {
      await TheftTrack.triggerTestCapture();
      Alert.alert(
        'Test Triggered',
        'Capturing photos and location now. Check the Logs tab in a few seconds. An email will be sent if configured.'
      );
    } catch (e) {
      Alert.alert('Error', 'Could not trigger test capture. Make sure permissions are granted.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Email alert config */}
        <Text style={styles.sectionTitle}>Alert Email</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Use a Gmail address with an App Password (not your regular password).{'\n'}
            Generate one at: Google Account → Security → App Passwords
          </Text>

          <Text style={styles.label}>From (Gmail address)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="yourname@gmail.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Gmail App Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="xxxx xxxx xxxx xxxx"
            placeholderTextColor="#555"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Send Alerts To</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="recipient@example.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Threshold */}
        <Text style={styles.sectionTitle}>Detection Threshold</Text>
        <View style={styles.card}>
          <Text style={styles.thresholdDesc}>
            Trigger capture after this many consecutive failed unlock attempts:
          </Text>
          <View style={styles.thresholdGrid}>
            {THRESHOLDS.map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.thresholdBtn, threshold === n && styles.thresholdBtnActive]}
                onPress={() => setThreshold(n)}
              >
                <Text
                  style={[styles.thresholdNum, threshold === n && styles.thresholdNumActive]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
        </TouchableOpacity>

        {/* Test */}
        <Text style={styles.sectionTitle}>Testing</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Manually trigger a capture to verify camera, location, and email are working.
            Camera and location permissions must be granted.
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnTest, testing && styles.btnDisabled]}
            onPress={testCapture}
            disabled={testing}
          >
            <Text style={styles.btnText}>{testing ? 'Triggering…' : 'Test Capture Now'}</Text>
          </TouchableOpacity>
        </View>

        {/* Permissions reminder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Required Permissions</Text>
          {[
            { icon: '📷', name: 'Camera', note: 'For silent photo capture' },
            { icon: '📍', name: 'Location', note: 'For GPS coordinates' },
            { icon: '🔐', name: 'Device Admin', note: 'To detect failed unlocks' },
          ].map(p => (
            <View key={p.name} style={styles.permRow}>
              <Text style={styles.permIcon}>{p.icon}</Text>
              <View>
                <Text style={styles.permName}>{p.name}</Text>
                <Text style={styles.permNote}>{p.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12 },
  hint: { color: '#888', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  thresholdDesc: { color: '#aaa', fontSize: 13, marginBottom: 12 },
  thresholdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thresholdBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdBtnActive: { backgroundColor: '#1565C0' },
  thresholdNum: { color: '#888', fontSize: 16, fontWeight: '600' },
  thresholdNumActive: { color: '#fff' },
  btn: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  btnTest: { backgroundColor: '#4A148C', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  permRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  permIcon: { fontSize: 20, marginRight: 12 },
  permName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  permNote: { color: '#888', fontSize: 12 },
});
