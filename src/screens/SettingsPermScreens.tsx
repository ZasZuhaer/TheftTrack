import React, { useCallback, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

function PermissionScreen({
  permission,
  title,
  description,
}: {
  permission: string;
  title: string;
  description: string;
}) {
  const [granted, setGranted] = useState(false);

  const check = useCallback(async () => {
    setGranted(await PermissionsAndroid.check(permission as any));
  }, [permission]);

  useFocusEffect(
    useCallback(() => {
      check();
      const sub = AppState.addEventListener('change', state => {
        if (state === 'active') check();
      });
      return () => sub.remove();
    }, [check])
  );

  const request = async () => {
    const result = await PermissionsAndroid.request(permission as any, {
      title: `${title} Permission`,
      message: description,
      buttonPositive: 'Grant',
      buttonNegative: 'Deny',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setGranted(true);
    } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Denied',
        `${title} permission was permanently denied. Open Settings to grant it manually.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, granted ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusText}>{granted ? 'Granted' : 'Not granted'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.hint}>{description}</Text>
        {granted ? (
          <TouchableOpacity style={styles.btnSecondary} onPress={() => Linking.openSettings()}>
            <Text style={styles.btnSecondaryText}>Manage in Settings</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={request}>
            <Text style={styles.btnText}>Grant {title}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

export function SettingsCameraPermScreen() {
  return (
    <PermissionScreen
      permission={PermissionsAndroid.PERMISSIONS.CAMERA}
      title="Camera"
      description="TheftTrack needs camera access to silently photograph intruders when a failed unlock attempt is detected."
    />
  );
}

export function SettingsLocationPermScreen() {
  return (
    <PermissionScreen
      permission={PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION}
      title="Location"
      description="TheftTrack needs location access to record GPS coordinates when an intrusion is detected."
    />
  );
}

const NEEDS_NOTIF = Platform.OS === 'android' && (Platform.Version as number) >= 33;

export function SettingsNotificationPermScreen() {
  if (!NEEDS_NOTIF) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Notification permission is not required on this version of Android.
          </Text>
        </View>
      </ScrollView>
    );
  }
  return (
    <PermissionScreen
      permission="android.permission.POST_NOTIFICATIONS"
      title="Notifications"
      description="TheftTrack needs notification access to alert you when an intrusion is detected."
    />
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
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#aaa', fontWeight: '600', fontSize: 15 },
});
