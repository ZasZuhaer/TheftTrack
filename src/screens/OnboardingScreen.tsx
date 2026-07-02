import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TheftTrack } from '../utils/NativeTheftTrack';

const NEEDS_NOTIF = Platform.OS === 'android' && (Platform.Version as number) >= 33;

// Returns N Animated.Values that stagger-animate (fade + slide up) on mount
function useEntryAnims(count: number): Animated.Value[] {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;
  useEffect(() => {
    Animated.stagger(
      75,
      anims.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 440,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return anims;
}

function ae(anim: Animated.Value): any {
  return {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
    ],
  };
}

// ── Shared small components ───────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.dot,
            i < step && styles.dotDone,
            i === step && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.outlineBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.outlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function GrantedBadge({ label }: { label: string }) {
  return (
    <View style={styles.grantedRow}>
      <View style={styles.grantedCircle}>
        <Text style={styles.grantedCheck}>✓</Text>
      </View>
      <Text style={styles.grantedLabel}>{label}</Text>
    </View>
  );
}

function SmallGrantedBadge() {
  return (
    <View style={styles.smallGranted}>
      <Text style={styles.smallGrantedText}>✓</Text>
    </View>
  );
}

// ── Step 0: Welcome ───────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const a = useEntryAnims(4);
  return (
    <View style={styles.page}>
      <View style={styles.pageContent}>
        <Animated.Text style={[styles.heroIcon, ae(a[0])]}>🛡️</Animated.Text>
        <Animated.Text style={[styles.pageTitle, ae(a[1])]}>
          Welcome to{'\n'}TheftTrack
        </Animated.Text>
        <Animated.Text style={[styles.pageSub, ae(a[2])]}>
          Your device's silent guardian. Set up in a few steps to start protecting against unauthorized access.
        </Animated.Text>
      </View>
      <Animated.View style={ae(a[3])}>
        <PrimaryButton label="Get Started" onPress={onNext} />
      </Animated.View>
    </View>
  );
}

// ── Step 1: Device Admin (required) ──────────────────────────────────────────

function AdminStep({
  adminActive,
  onRequest,
  onNext,
}: {
  adminActive: boolean;
  onRequest: () => void;
  onNext: () => void;
}) {
  const a = useEntryAnims(4);
  return (
    <View style={styles.page}>
      <View style={styles.pageContent}>
        <Animated.Text style={[styles.heroIcon, ae(a[0])]}>🔒</Animated.Text>
        <Animated.Text style={[styles.pageTitle, ae(a[1])]}>Device Administrator</Animated.Text>
        <Animated.Text style={[styles.pageSub, ae(a[2])]}>
          TheftTrack needs Device Administrator access to detect when someone enters the wrong PIN or password. This is the core of how the app works.
        </Animated.Text>
      </View>
      <Animated.View style={[styles.btnArea, ae(a[3])]}>
        {adminActive
          ? <GrantedBadge label="Device Admin Enabled" />
          : <OutlineButton label="Enable Device Admin" onPress={onRequest} />
        }
        <PrimaryButton label="Continue" onPress={onNext} disabled={!adminActive} />
      </Animated.View>
    </View>
  );
}

// ── Step 2: Camera (required) ─────────────────────────────────────────────────

function CameraStep({
  cameraGranted,
  onRequest,
  onNext,
}: {
  cameraGranted: boolean;
  onRequest: () => void;
  onNext: () => void;
}) {
  const a = useEntryAnims(4);
  return (
    <View style={styles.page}>
      <View style={styles.pageContent}>
        <Animated.Text style={[styles.heroIcon, ae(a[0])]}>📷</Animated.Text>
        <Animated.Text style={[styles.pageTitle, ae(a[1])]}>Camera Access</Animated.Text>
        <Animated.Text style={[styles.pageSub, ae(a[2])]}>
          TheftTrack silently captures photos of anyone who tries to unlock your device — no flash, no sound. Both front and rear cameras are used to photograph intruders from every angle.
        </Animated.Text>
      </View>
      <Animated.View style={[styles.btnArea, ae(a[3])]}>
        {cameraGranted
          ? <GrantedBadge label="Camera Access Granted" />
          : <OutlineButton label="Allow Camera" onPress={onRequest} />
        }
        <PrimaryButton label="Continue" onPress={onNext} disabled={!cameraGranted} />
      </Animated.View>
    </View>
  );
}

// ── Step 3: Optional permissions ──────────────────────────────────────────────

function OptionalStep({
  locationGranted,
  notifGranted,
  onRequestLocation,
  onRequestNotif,
  onDone,
}: {
  locationGranted: boolean;
  notifGranted: boolean;
  onRequestLocation: () => void;
  onRequestNotif: () => void;
  onDone: () => void;
}) {
  const count = NEEDS_NOTIF ? 6 : 5;
  const a = useEntryAnims(count);
  const btnIndex = NEEDS_NOTIF ? 5 : 4;
  return (
    <View style={styles.page}>
      <View style={styles.pageContent}>
        <Animated.Text style={[styles.heroIcon, ae(a[0])]}>✨</Animated.Text>
        <Animated.Text style={[styles.pageTitle, ae(a[1])]}>Unlock More Features</Animated.Text>
        <Animated.Text style={[styles.pageSub, ae(a[2])]}>
          These are optional — you can allow them later in Settings to unlock additional features.
        </Animated.Text>

        <Animated.View style={[styles.optCard, ae(a[3])]}>
          <View style={styles.optCardIconWrap}>
            <Text style={styles.optCardIconText}>📍</Text>
          </View>
          <View style={styles.optCardBody}>
            <Text style={styles.optCardTitle}>Location</Text>
            <Text style={styles.optCardDesc}>
              Records where an intrusion happened so you can track your device
            </Text>
          </View>
          {locationGranted ? (
            <SmallGrantedBadge />
          ) : (
            <TouchableOpacity style={styles.allowBtn} onPress={onRequestLocation} activeOpacity={0.8}>
              <Text style={styles.allowBtnText}>Allow</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {NEEDS_NOTIF && (
          <Animated.View style={[styles.optCard, ae(a[4])]}>
            <View style={styles.optCardIconWrap}>
              <Text style={styles.optCardIconText}>🔔</Text>
            </View>
            <View style={styles.optCardBody}>
              <Text style={styles.optCardTitle}>Notifications</Text>
              <Text style={styles.optCardDesc}>
                Enable app notifications
              </Text>
            </View>
            {notifGranted ? (
              <SmallGrantedBadge />
            ) : (
              <TouchableOpacity style={styles.allowBtn} onPress={onRequestNotif} activeOpacity={0.8}>
                <Text style={styles.allowBtnText}>Allow</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </View>

      <Animated.View style={[styles.btnArea, ae(a[btnIndex])]}>
        <PrimaryButton label="Finish Setup" onPress={onDone} />
        <TouchableOpacity onPress={onDone} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [adminActive, setAdminActive] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(!NEEDS_NOTIF);

  useEffect(() => {
    (async () => {
      const [cam, loc, adm] = await Promise.all([
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
        TheftTrack.isDeviceAdminActive(),
      ]);
      setCameraGranted(cam);
      setLocationGranted(loc);
      setAdminActive(adm);
      if (NEEDS_NOTIF) {
        const notif = await PermissionsAndroid.check(
          'android.permission.POST_NOTIFICATIONS' as any
        );
        setNotifGranted(notif);
      }
    })();
  }, []);

  // Re-check admin when returning from the system Device Admin grant screen
  useEffect(() => {
    if (step !== 1) return;
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        const active = await TheftTrack.isDeviceAdminActive();
        setAdminActive(active);
      }
    });
    return () => sub.remove();
  }, [step]);

  const advance = () => setStep(s => s + 1);

  const finish = async () => {
    await TheftTrack.markOnboardingComplete();
    onComplete();
  };

  const requestCamera = async () => {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Camera Permission',
      message: 'TheftTrack needs camera access to silently photograph intruders.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    setCameraGranted(r === PermissionsAndroid.RESULTS.GRANTED);
  };

  const requestLocation = async () => {
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'TheftTrack needs location to record where an intrusion happened.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    setLocationGranted(r === PermissionsAndroid.RESULTS.GRANTED);
  };

  const requestNotif = async () => {
    if (!NEEDS_NOTIF) return;
    const r = await PermissionsAndroid.request(
      'android.permission.POST_NOTIFICATIONS' as any,
      {
        title: 'Notification Permission',
        message: 'TheftTrack needs notifications to alert you of intrusion events.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    setNotifGranted(r === PermissionsAndroid.RESULTS.GRANTED);
  };

  return (
    <View style={styles.root}>
      {step > 0 && step < 4 && <ProgressDots step={step} />}
      {step === 0 && <WelcomeStep onNext={advance} />}
      {step === 1 && (
        <AdminStep
          adminActive={adminActive}
          onRequest={() => TheftTrack.requestDeviceAdmin()}
          onNext={advance}
        />
      )}
      {step === 2 && (
        <CameraStep
          cameraGranted={cameraGranted}
          onRequest={requestCamera}
          onNext={advance}
        />
      )}
      {step === 3 && (
        <OptionalStep
          locationGranted={locationGranted}
          notifGranted={notifGranted}
          onRequestLocation={requestLocation}
          onRequestNotif={requestNotif}
          onDone={finish}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },

  // Progress indicator
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C2C2C',
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
    backgroundColor: '#1A73E8',
  },
  dotDone: {
    backgroundColor: '#1A73E8',
    opacity: 0.4,
  },

  // Page shell
  page: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 36,
    paddingTop: 8,
  },
  pageContent: {
    flex: 1,
    justifyContent: 'center',
  },

  // Typography
  heroIcon: {
    fontSize: 76,
    textAlign: 'center',
    marginBottom: 28,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 36,
    marginBottom: 14,
  },
  pageSub: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 4,
  },

  // Required warning card (amber accent)
  requiredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 124, 0, 0.09)',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F57C00',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 24,
    gap: 10,
  },
  requiredCardIcon: { fontSize: 18 },
  requiredCardText: {
    flex: 1,
    color: '#F9A825',
    fontSize: 13,
    lineHeight: 19,
  },

  // Optional permission cards
  optCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 12,
  },
  optCardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optCardIconText: { fontSize: 20 },
  optCardBody: { flex: 1 },
  optCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  optCardDesc: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

  // Allow button inside optional cards
  allowBtn: {
    backgroundColor: '#1A3A5C',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  allowBtnText: {
    color: '#90CAF9',
    fontSize: 13,
    fontWeight: '600',
  },

  // Small granted badge for optional cards
  smallGranted: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallGrantedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },

  // Button area
  btnArea: { gap: 10 },

  primaryBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnDisabled: { opacity: 0.32 },

  outlineBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1A73E8',
  },
  outlineBtnText: {
    color: '#1A73E8',
    fontSize: 16,
    fontWeight: '600',
  },

  // Large granted badge (steps 1 & 2)
  grantedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  grantedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  grantedCheck: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
  },
  grantedLabel: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '600',
  },

  // Skip link (step 3)
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    color: '#555',
    fontSize: 14,
  },
});
