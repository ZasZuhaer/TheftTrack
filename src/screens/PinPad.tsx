import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PIN_LENGTH = 4;
const PAD: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', '⌫'],
];

interface Props {
  title?: string;
  error?: string;
  onComplete: (pin: string) => void;
}

export function PinPad({ title, error, onComplete }: Props) {
  const [pin, setPin] = useState('');

  const press = (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (!key || pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        setPin('');
        onComplete(next);
      }, 120);
    }
  };

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length ? styles.dotFilled : styles.dotEmpty]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorPlaceholder} />}
      <View style={styles.pad}>
        {PAD.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((key, ki) => (
              <TouchableOpacity
                key={ki}
                style={[styles.key, !key && styles.keyInvisible]}
                onPress={() => press(key)}
                disabled={!key}
                activeOpacity={key ? 0.5 : 1}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%', paddingHorizontal: 24 },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotFilled: { backgroundColor: '#fff' },
  dotEmpty: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#555' },
  error: { color: '#F44336', fontSize: 13, textAlign: 'center', marginBottom: 4 },
  errorPlaceholder: { height: 21, marginBottom: 4 },
  pad: { marginTop: 20, width: '100%', maxWidth: 280 },
  padRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyInvisible: { backgroundColor: 'transparent' },
  keyText: { color: '#fff', fontSize: 26, fontWeight: '300' },
});
