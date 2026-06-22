import React, { useCallback, useState } from 'react';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TheftTrack } from '../utils/NativeTheftTrack';

export function SettingsDeviceAdminScreen() {
  const [adminActive, setAdminActive] = useState(false);

  const load = useCallback(async () => {
    setAdminActive(await TheftTrack.isDeviceAdminActive());
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, adminActive ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusText}>
            {adminActive ? 'Active — monitoring unlock failures' : 'Not granted'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.hint}>
          Device Administrator access is required to detect failed unlock attempts.
          Without it, TheftTrack cannot trigger captures.
        </Text>
        {adminActive ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={() =>
              Alert.alert('Remove Device Admin', 'This will disable theft protection. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: async () => { await TheftTrack.removeDeviceAdmin(); setAdminActive(false); },
                },
              ])
            }
          >
            <Text style={styles.btnText}>Remove Device Admin</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={() => TheftTrack.requestDeviceAdmin()}>
            <Text style={styles.btnText}>Grant Device Admin</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#F44336' },
  statusText: { color: '#ccc', fontSize: 14 },
  hint: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  btn: { backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDanger: { backgroundColor: '#B71C1C' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
