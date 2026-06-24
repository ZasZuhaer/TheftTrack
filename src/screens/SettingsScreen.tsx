import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  PermissionsAndroid,
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

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const [locationEnabled, setLocationEnabledState] = useState(false);
  const [threshold, setThreshold] = useState(3);
  const [recipient, setRecipient] = useState('');
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  // Each load() call gets a sequence number. If a newer load() starts before
  // an older one resolves, the older result is discarded. This prevents an
  // AppState-triggered reload from overwriting an in-progress user action.
  const loadEpoch = useRef(0);

  const load = useCallback(async () => {
    const epoch = ++loadEpoch.current;
    const [settings, appLock] = await Promise.all([
      TheftTrack.getSettings(),
      TheftTrack.getAppLock(),
    ]);
    if (epoch !== loadEpoch.current) return;

    let locationEnabled = settings.locationEnabled;
    if (locationEnabled) {
      // Verify the OS permission is still granted. If the user revoked it from
      // system settings, sync the stored value back to false automatically.
      const permStillGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (!permStillGranted) {
        locationEnabled = false;
        TheftTrack.setLocationEnabled(false);
      }
    }

    if (epoch !== loadEpoch.current) return;
    setLocationEnabledState(locationEnabled);
    setThreshold(settings.threshold);
    setRecipient(settings.recipient);
    setAppLockEnabled(appLock.enabled);
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
    if (!val) {
      await TheftTrack.setLocationEnabled(false);
      setLocationEnabledState(false);
      return;
    }

    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    if (alreadyGranted) {
      await TheftTrack.setLocationEnabled(true);
      setLocationEnabledState(true);
      return;
    }

    // Permission not granted — ask before enabling tracking
    Alert.alert(
      'Location Permission Required',
      'Location tracking needs access to your device location. Please allow the permission to enable this feature.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setLocationEnabledState(false),
        },
        {
          text: 'Allow',
          onPress: async () => {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              {
                title: 'Location Permission',
                message: 'TheftTrack needs location access to record where an intrusion happened.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              }
            );
            if (result === PermissionsAndroid.RESULTS.GRANTED) {
              await TheftTrack.setLocationEnabled(true);
            }
            // load() advances the epoch, discarding any AppState-triggered load
            // that raced while the OS dialog was open. Storage is already updated
            // above so this read reflects the correct final state.
            load();
          },
        },
      ]
    );
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

      <SectionHeader title="Advanced" />
      <View style={styles.card}>
        <Row
          title="App Lock"
          description={appLockEnabled ? 'Enabled' : 'Disabled'}
          descriptionColor={appLockEnabled ? '#4CAF50' : '#888'}
          onPress={() => navigation.navigate('AppLock')}
        />
        <Separator />
        <Row
          title="Permissions"
          description="Device Admin, Camera, Location & more"
          onPress={() => navigation.navigate('ManagePermissions')}
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
