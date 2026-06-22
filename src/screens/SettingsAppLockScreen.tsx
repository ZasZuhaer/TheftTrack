import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PinPad } from './PinPad';
import { TheftTrack } from '../utils/NativeTheftTrack';

type Step = 'status' | 'enter_new' | 'confirm_new' | 'verify_disable';

export function SettingsAppLockScreen() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('status');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [pinKey, setPinKey] = useState(0);

  useEffect(() => {
    TheftTrack.getAppLock().then(({ enabled: e }) => {
      setEnabled(e);
      setLoading(false);
    });
  }, []);

  const resetPad = (msg = '') => {
    setError(msg);
    setPinKey(k => k + 1);
  };

  const goStatus = () => { setStep('status'); resetPad(); };

  const handleNewPin = (pin: string) => {
    setNewPin(pin);
    setStep('confirm_new');
    resetPad();
  };

  const handleConfirmPin = async (pin: string) => {
    if (pin !== newPin) { resetPad("PINs don't match. Try again."); return; }
    try {
      await TheftTrack.setAppLock(true, pin);
      setEnabled(true);
      setStep('status');
      Alert.alert('App Lock Enabled', 'Your PIN has been set successfully.');
    } catch {
      Alert.alert('Error', 'Could not enable App Lock.');
    }
  };

  const handleVerifyDisable = async (pin: string) => {
    const { pin: stored } = await TheftTrack.getAppLock();
    if (pin !== stored) { resetPad('Incorrect PIN. Try again.'); return; }
    try {
      await TheftTrack.setAppLock(false, '');
      setEnabled(false);
      setStep('status');
      Alert.alert('App Lock Disabled', 'App Lock has been turned off.');
    } catch {
      Alert.alert('Error', 'Could not disable App Lock.');
    }
  };

  if (loading) return <View style={styles.screen} />;

  if (step === 'enter_new') {
    return (
      <View style={styles.pinContainer}>
        <PinPad key={pinKey} title="Set a new PIN" error={error} onComplete={handleNewPin} />
        <TouchableOpacity style={styles.cancelBtn} onPress={goStatus}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm_new') {
    return (
      <View style={styles.pinContainer}>
        <PinPad key={pinKey} title="Confirm your PIN" error={error} onComplete={handleConfirmPin} />
        <TouchableOpacity style={styles.cancelBtn} onPress={goStatus}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'verify_disable') {
    return (
      <View style={styles.pinContainer}>
        <PinPad key={pinKey} title="Enter current PIN to disable" error={error} onComplete={handleVerifyDisable} />
        <TouchableOpacity style={styles.cancelBtn} onPress={goStatus}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, enabled ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusText}>{enabled ? 'App Lock is active' : 'App Lock is disabled'}</Text>
        </View>
        <Text style={styles.hint}>
          {enabled
            ? 'A PIN is required every time TheftTrack is opened.'
            : 'Require a PIN to open TheftTrack, preventing others from disabling theft protection.'}
        </Text>
      </View>

      {enabled ? (
        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => { resetPad(); setStep('verify_disable'); }}>
          <Text style={styles.btnText}>Disable App Lock</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.btn} onPress={() => { resetPad(); setStep('enter_new'); }}>
          <Text style={styles.btnText}>Enable App Lock</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  pinContainer: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#F44336' },
  statusText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  hint: { color: '#888', fontSize: 13, lineHeight: 18 },
  btn: { backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDanger: { backgroundColor: '#B71C1C' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { marginTop: 28 },
  cancelText: { color: '#666', fontSize: 14 },
});
