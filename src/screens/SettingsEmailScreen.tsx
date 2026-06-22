import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';

export function SettingsEmailScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recipient, setRecipient] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    TheftTrack.getSettings().then(s => {
      setEmail(s.email);
      setPassword(s.password);
      setRecipient(s.recipient);
    });
  }, []);

  const save = async () => {
    if (!email || !password || !recipient) {
      Alert.alert('Missing Fields', 'Please fill in all email fields.');
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
      await TheftTrack.saveSettings(email, password, recipient, current.threshold, current.enabled);
      Alert.alert('Saved', 'Email settings saved.');
    } catch {
      Alert.alert('Error', 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#121212' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  hint: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#1E1E1E',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  label: { color: '#888', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginTop: 20, marginBottom: 6 },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  btn: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
