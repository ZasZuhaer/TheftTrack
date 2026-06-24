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

export function SettingsPicturesScreen() {
  const [frontShots, setFrontShots] = useState(1);
  const [backShots, setBackShots] = useState(1);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  const load = useCallback(async () => {
    const s = await TheftTrack.getSettings();
    setFrontShots(s.frontShots);
    setBackShots(s.backShots);
    setWatermarkEnabled(s.watermarkEnabled);
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

  const save = useCallback(
    (front: number, back: number, watermark: boolean) => {
      TheftTrack.savePictureSettings(front, back, watermark);
    },
    []
  );

  const changeFront = (delta: number) => {
    const next = Math.min(5, Math.max(1, frontShots + delta));
    setFrontShots(next);
    save(next, backShots, watermarkEnabled);
  };

  const changeBack = (delta: number) => {
    const next = Math.min(5, Math.max(1, backShots + delta));
    setBackShots(next);
    save(frontShots, next, watermarkEnabled);
  };

  const toggleWatermark = (val: boolean) => {
    setWatermarkEnabled(val);
    save(frontShots, backShots, val);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>CAMERA SHOTS</Text>
      <View style={styles.card}>
        <ShotRow
          label="Front Camera"
          description="Photos taken from the front-facing camera"
          value={frontShots}
          onDecrement={() => changeFront(-1)}
          onIncrement={() => changeFront(1)}
        />
        <Separator />
        <ShotRow
          label="Back Camera"
          description="Photos taken from the rear camera"
          value={backShots}
          onDecrement={() => changeBack(-1)}
          onIncrement={() => changeBack(1)}
        />
      </View>

      <Text style={styles.sectionLabel}>WATERMARK</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Remove Watermark</Text>
          </View>
          <Switch
            value={!watermarkEnabled}
            onValueChange={val => toggleWatermark(!val)}
            trackColor={{ false: '#555', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function ShotRow({
  label,
  description,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  description: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <View style={styles.counter}>
        <TouchableOpacity
          style={[styles.counterBtn, value <= 1 && styles.counterBtnDisabled]}
          onPress={onDecrement}
          disabled={value <= 1}
          activeOpacity={0.6}
        >
          <Text style={styles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.counterBtn, value >= 5 && styles.counterBtnDisabled]}
          onPress={onIncrement}
          disabled={value >= 5}
          activeOpacity={0.6}
        >
          <Text style={styles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowContent: { flex: 1, marginRight: 12 },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  rowDesc: { color: '#888', fontSize: 12, marginTop: 2, lineHeight: 17 },
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
    minWidth: 24,
    textAlign: 'center',
  },
  separator: { height: 1, backgroundColor: '#2C2C2C', marginLeft: 16 },
});
