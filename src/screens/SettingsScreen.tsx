import React, { useCallback, useState } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TheftTrack } from '../utils/NativeTheftTrack';
import type { SettingsStackParamList } from '../types';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsList'>;

const NEEDS_NOTIF = Platform.OS === 'android' && (Platform.Version as number) >= 33;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const [adminActive, setAdminActive] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(true);
  const [locationEnabled, setLocationEnabledState] = useState(true);
  const [threshold, setThreshold] = useState(3);
  const [recipient, setRecipient] = useState('');

  const load = useCallback(async () => {
    const [admin, settings, camera, location, notif] = await Promise.all([
      TheftTrack.isDeviceAdminActive(),
      TheftTrack.getSettings(),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
      NEEDS_NOTIF
        ? PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS' as any)
        : Promise.resolve(true),
    ]);
    setAdminActive(admin);
    setLocationEnabledState(settings.locationEnabled);
    setThreshold(settings.threshold);
    setRecipient(settings.recipient);
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

  const toggleLocation = async (val: boolean) => {
    setLocationEnabledState(val);
    await TheftTrack.setLocationEnabled(val);
  };

  const thresholdDesc = `Trigger after ${threshold} failed attempt${threshold !== 1 ? 's' : ''}`;
  const emailDesc = recipient ? `Sends alerts to ${recipient}` : 'Not configured';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Configure" />
      <View style={styles.card}>
        <Row title="Failed Attempts" description={thresholdDesc} onPress={() => navigation.navigate('FailedAttempts')} />
        <Separator />
        <Row title="Email" description={emailDesc} onPress={() => navigation.navigate('Email')} />
      </View>

      <SectionHeader title="Actions" />
      <View style={styles.card}>
        <Row title="Pictures" description="Test capture and verify" onPress={() => navigation.navigate('Pictures')} />
        <Separator />
        <ToggleRow
          title="Location"
          description="Record GPS coordinates during detection"
          value={locationEnabled}
          onValueChange={toggleLocation}
        />
      </View>

      <SectionHeader title="Permissions" />
      <View style={styles.card}>
        <Row
          title="Device Admin"
          description={adminActive ? 'Active' : 'Not granted'}
          descriptionColor={adminActive ? '#4CAF50' : '#F44336'}
          onPress={() => navigation.navigate('DeviceAdmin')}
        />
        <Separator />
        <Row
          title="Camera"
          description={cameraGranted ? 'Granted' : 'Not granted'}
          descriptionColor={cameraGranted ? '#4CAF50' : '#F44336'}
          onPress={() => navigation.navigate('CameraPermission')}
        />
        <Separator />
        <Row
          title="Location"
          description={locationGranted ? 'Granted' : 'Not granted'}
          descriptionColor={locationGranted ? '#4CAF50' : '#F44336'}
          onPress={() => navigation.navigate('LocationPermission')}
        />
        <Separator />
        <Row
          title="Notifications"
          description={notifGranted ? 'Granted' : 'Not granted'}
          descriptionColor={notifGranted ? '#4CAF50' : '#F44336'}
          onPress={() => navigation.navigate('NotificationPermission')}
        />
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
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

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#555', true: '#4CAF50' }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  sectionHeader: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowContent: { flex: 1, marginRight: 8 },
  rowTitle: { color: '#fff', fontSize: 15 },
  rowDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  chevron: { color: '#555', fontSize: 22 },
  separator: { height: 1, backgroundColor: '#2C2C2C', marginLeft: 16 },
});
