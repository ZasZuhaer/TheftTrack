import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PinPad } from './PinPad';
import { TheftTrack } from '../utils/NativeTheftTrack';

interface Props {
  onUnlock: () => void;
}

export function AppLockScreen({ onUnlock }: Props) {
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const handlePin = async (pin: string) => {
    const { pin: stored } = await TheftTrack.getAppLock();
    if (pin === stored) {
      setError('');
      onUnlock();
    } else {
      setError('Incorrect PIN. Try again.');
      setAttempt(a => a + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>TheftTrack</Text>
      <Text style={styles.subtitle}>Enter PIN to unlock</Text>
      <PinPad key={attempt} error={error} onComplete={handlePin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  appName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 52,
  },
});
