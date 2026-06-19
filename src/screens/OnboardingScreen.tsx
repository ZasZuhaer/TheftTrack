import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';

type PermStatus = 'unknown' | 'granted' | 'denied';

interface PermState {
  camera: PermStatus;
  location: PermStatus;
  notification: PermStatus;
}

const NEEDS_NOTIF = Platform.OS === 'android' && (Platform.Version as number) >= 33;

async function queryPermissions(): Promise<PermState> {
  const camera = (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA))
    ? 'granted' : 'denied';
  const location = (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION))
    ? 'granted' : 'denied';
  let notification: PermStatus = 'granted';
  if (NEEDS_NOTIF) {
    notification = (await PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS' as any))
      ? 'granted' : 'denied';
  }
  return { camera, location, notification };
}

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const [perms, setPerms] = useState<PermState>({
    camera: 'unknown',
    location: 'unknown',
    notification: 'unknown',
  });
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshPerms = useCallback(async () => {
    setPerms(await queryPermissions());
  }, []);

  useEffect(() => { refreshPerms(); }, [refreshPerms]);

  const requestCamera = async () => {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Camera Permission',
      message: 'TheftTrack needs camera access to silently photograph intruders.',
      buttonPositive: 'Grant',
      buttonNegative: 'Deny',
    });
    setPerms(p => ({ ...p, camera: result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied' }));
  };

  const requestLocation = async () => {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location Permission',
      message: 'TheftTrack needs location access to record where an intrusion happened.',
      buttonPositive: 'Grant',
      buttonNegative: 'Deny',
    });
    setPerms(p => ({ ...p, location: result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied' }));
  };

  const requestNotification = async () => {
    if (!NEEDS_NOTIF) return;
    const result = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any, {
      title: 'Notification Permission',
      message: 'TheftTrack needs notification access to alert you of intrusion events.',
      buttonPositive: 'Grant',
      buttonNegative: 'Deny',
    });
    setPerms(p => ({ ...p, notification: result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied' }));
  };

  const finish = async () => {
    const trimmed = email.trim();
    if (trimmed) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(trimmed)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address or leave it blank.');
        return;
      }
    }
    setSaving(true);
    try {
      if (trimmed) await TheftTrack.saveRecipientEmail(trimmed);
      await TheftTrack.markOnboardingComplete();
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const allGranted =
    perms.camera === 'granted' &&
    perms.location === 'granted' &&
    (!NEEDS_NOTIF || perms.notification === 'granted');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#121212' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🛡️</Text>
          <Text style={styles.heroTitle}>TheftTrack</Text>
          <Text style={styles.heroSub}>
            Silently captures evidence when someone tries to unlock your device without permission.
          </Text>
        </View>

        {/* Permissions */}
        <Text style={styles.sectionLabel}>REQUIRED PERMISSIONS</Text>
        <View style={styles.card}>
          <PermRow
            icon="📷"
            title="Camera"
            desc="Silently photograph the intruder"
            status={perms.camera}
            onGrant={requestCamera}
          />
          <Divider />
          <PermRow
            icon="📍"
            title="Location"
            desc="Record where the intrusion happened"
            status={perms.location}
            onGrant={requestLocation}
          />
          {NEEDS_NOTIF && (
            <>
              <Divider />
              <PermRow
                icon="🔔"
                title="Notifications"
                desc="Alert you when an intrusion is logged"
                status={perms.notification}
                onGrant={requestNotification}
              />
            </>
          )}
        </View>

        {allGranted && (
          <View style={styles.allGrantedBanner}>
            <Text style={styles.allGrantedText}>✓ All permissions granted</Text>
          </View>
        )}

        {/* Alert email */}
        <Text style={styles.sectionLabel}>ALERT EMAIL  <Text style={styles.optionalTag}>OPTIONAL</Text></Text>
        <View style={styles.card}>
          <Text style={styles.emailHint}>
            Where should photos and location be emailed when an intrusion is detected? You can configure or change this later in Settings.
          </Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="recipient@example.com"
            placeholderTextColor="#444"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>

        {/* Action */}
        <TouchableOpacity
          style={[styles.actionBtn, saving && styles.btnDisabled]}
          onPress={finish}
          disabled={saving}
        >
          <Text style={styles.actionBtnText}>
            {saving ? 'Setting up…' : allGranted ? 'Continue' : 'Setup Later'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          You can grant permissions and configure email later from the app's Home and Settings screens.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PermRow({
  icon,
  title,
  desc,
  status,
  onGrant,
}: {
  icon: string;
  title: string;
  desc: string;
  status: PermStatus;
  onGrant: () => void;
}) {
  const granted = status === 'granted';
  return (
    <View style={styles.permRow}>
      <Text style={styles.permIcon}>{icon}</Text>
      <View style={styles.permText}>
        <Text style={styles.permTitle}>{title}</Text>
        <Text style={styles.permDesc}>{desc}</Text>
      </View>
      {granted ? (
        <View style={styles.grantedBadge}>
          <Text style={styles.grantedBadgeText}>✓</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.grantBtn} onPress={onGrant}>
          <Text style={styles.grantBtnText}>Grant</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  hero: { alignItems: 'center', paddingVertical: 32 },
  heroIcon: { fontSize: 72, marginBottom: 12 },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  heroSub: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  optionalTag: {
    color: '#555',
    fontSize: 10,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  permIcon: { fontSize: 22, marginRight: 12 },
  permText: { flex: 1 },
  permTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  grantBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  grantBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  grantedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantedBadgeText: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#333', marginHorizontal: 14 },
  allGrantedBanner: {
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  allGrantedText: { color: '#4CAF50', fontWeight: '700', fontSize: 14 },
  emailHint: { color: '#888', fontSize: 12, lineHeight: 18, padding: 14, paddingBottom: 0 },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    margin: 12,
  },
  actionBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  footer: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
