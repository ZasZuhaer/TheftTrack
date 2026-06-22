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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TheftTrack } from '../utils/NativeTheftTrack';
import type { SettingsStackParamList } from '../types';

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

const NEEDS_NOTIF = Platform.OS === 'android' && (Platform.Version as number) >= 33;

export function SettingsManagePermissionsScreen() {
  const navigation = useNavigation<Nav>();
  const [adminActive, setAdminActive] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(true);

  const load = useCallback(async () => {
    const [admin, camera, location, notif] = await Promise.all([
      TheftTrack.isDeviceAdminActive(),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
      NEEDS_NOTIF
        ? PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS' as any)
        : Promise.resolve(true),
    ]);
    setAdminActive(admin);
    setCameraGranted(camera);
    setLocationGranted(location);
    setNotifGranted(notif as boolean);
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

  const requestPerm = async (permission: string, label: string, setter: (v: boolean) => void) => {
    const result = await PermissionsAndroid.request(permission as any, {
      title: `${label} Permission`,
      message: `TheftTrack needs ${label.toLowerCase()} access to record evidence during intrusion detection.`,
      buttonPositive: 'Grant',
      buttonNegative: 'Deny',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setter(true);
    } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Denied',
        `${label} permission was permanently denied. Open Settings to grant it manually.`,
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
        <Row
          title="Device Admin"
          description={adminActive ? 'Active' : 'Inactive'}
          descriptionColor={adminActive ? '#4CAF50' : '#F44336'}
          onPress={() => navigation.navigate('DeviceAdmin')}
        />
        <Separator />
        <PermRow
          title="Camera"
          granted={cameraGranted}
          onAllow={() => requestPerm(PermissionsAndroid.PERMISSIONS.CAMERA, 'Camera', setCameraGranted)}
        />
        <Separator />
        <PermRow
          title="Location"
          granted={locationGranted}
          onAllow={() => requestPerm(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, 'Location', setLocationGranted)}
        />
        <Separator />
        <PermRow
          title="Notifications"
          granted={notifGranted}
          onAllow={() => NEEDS_NOTIF && requestPerm('android.permission.POST_NOTIFICATIONS', 'Notifications', setNotifGranted)}
        />
      </View>
    </ScrollView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function Row({
  title,
  description,
  descriptionColor,
  onPress,
}: {
  title: string;
  description?: string;
  descriptionColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? (
          <Text style={[styles.rowDesc, descriptionColor ? { color: descriptionColor } : null]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function PermRow({
  title,
  granted,
  onAllow,
}: {
  title: string;
  granted: boolean;
  onAllow: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={[styles.rowDesc, { color: granted ? '#4CAF50' : '#F44336' }]}>
          {granted ? 'Allowed' : 'Not granted'}
        </Text>
      </View>
      {!granted && (
        <TouchableOpacity style={styles.allowBtn} onPress={onAllow}>
          <Text style={styles.allowBtnText}>Allow</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowContent: { flex: 1, marginRight: 8 },
  rowTitle: { color: '#fff', fontSize: 15 },
  rowDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  chevron: { color: '#555', fontSize: 22 },
  allowBtn: { backgroundColor: '#1565C0', borderRadius: 7, paddingHorizontal: 14, paddingVertical: 6 },
  allowBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#2C2C2C', marginLeft: 16 },
});
