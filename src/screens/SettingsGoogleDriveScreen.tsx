import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TheftTrack } from '../utils/NativeTheftTrack';
import * as DriveService from '../utils/GoogleDriveService';
import * as DriveUploadManager from '../utils/DriveUploadManager';

export function SettingsGoogleDriveScreen() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [uploadPictures, setUploadPictures] = useState(true);
  const [uploadVideos, setUploadVideos] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Upload state is sourced from the module-level manager so it persists
  // across navigation and can also be shown app-wide via DriveUploadBanner.
  const [uploadState, setUploadState] = useState(DriveUploadManager.getState);

  useEffect(() => {
    DriveService.configure();
    return DriveUploadManager.subscribe(setUploadState);
  }, []);

  useFocusEffect(
    useCallback(() => {
      TheftTrack.getSettings().then(s => {
        setUploadPictures(s.driveUploadPictures);
        setUploadVideos(s.driveUploadVideos);
      });
      const u = DriveService.getCurrentUser();
      setUserEmail((u as any)?.user?.email ?? null);
    }, [])
  );

  const handleSignIn = async () => {
    if (!DriveService.isConfigured()) {
      Alert.alert(
        'Setup Required',
        'Set your Google Web Client ID in src/utils/GoogleDriveService.ts before signing in.'
      );
      return;
    }
    setIsSigningIn(true);
    try {
      await DriveService.signIn();
      const u = DriveService.getCurrentUser();
      setUserEmail((u as any)?.user?.email ?? null);
    } catch (e: any) {
      if (e.code !== DriveService.statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Sign-In Failed', e.message ?? 'Could not sign in to Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Disconnect Google Account', 'Sign out from TheftTrack Drive backup?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await DriveService.signOut();
            setUserEmail(null);
            DriveUploadManager.dismiss();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Could not sign out.');
          }
        },
      },
    ]);
  };

  const togglePictures = (val: boolean) => {
    setUploadPictures(val);
    TheftTrack.saveDriveSettings(val, uploadVideos);
  };

  const toggleVideos = (val: boolean) => {
    setUploadVideos(val);
    TheftTrack.saveDriveSettings(uploadPictures, val);
  };

  // Delegates to the persistent manager — the upload continues even if the
  // user navigates away from this screen.
  const handleUpload = () => {
    DriveUploadManager.start(uploadPictures, uploadVideos);
  };

  const signedIn = userEmail !== null;
  const { isUploading, statusMsg, statusIsError } = uploadState;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={styles.card}>
        {signedIn ? (
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{userEmail[0].toUpperCase()}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountEmail} numberOfLines={1}>{userEmail}</Text>
              <Text style={styles.accountSub}>Connected to Google Drive</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.signInCard}>
            <Text style={styles.signInTitle}>Connect your Google Account</Text>
            <Text style={styles.signInSub}>
              Back up intrusion photos and videos to your personal Google Drive. Files are stored in a "TheftTrack Backups" folder.
            </Text>
            <TouchableOpacity
              style={[styles.signInBtn, isSigningIn && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={isSigningIn}
              activeOpacity={0.8}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signInBtnText}>Sign in with Google</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upload settings — only visible when signed in */}
      {signedIn && (
        <>
          <SectionHeader title="What to Upload" />
          <View style={styles.card}>
            <ToggleRow
              title="Pictures"
              description="Front and back camera photos"
              value={uploadPictures}
              onValueChange={togglePictures}
            />
            <Separator />
            <ToggleRow
              title="Videos"
              description="Recorded video clips"
              value={uploadVideos}
              onValueChange={toggleVideos}
            />
          </View>

          <TouchableOpacity
            style={[styles.uploadBtn, isUploading && styles.btnDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.uploadBtnText}>Upload to Google Drive</Text>
            )}
          </TouchableOpacity>

          {statusMsg !== null && (
            <Text style={[styles.statusText, statusIsError && styles.statusError]}>
              {statusMsg}
            </Text>
          )}
        </>
      )}

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          Files are organised in your Google Drive under{' '}
          <Text style={styles.infoMono}>TheftTrack Backups</Text>. Each intrusion gets its own
          folder. Only files created by this app are accessible — no other Drive content is touched.
        </Text>
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

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
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
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden' },

  accountRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  accountInfo: { flex: 1 },
  accountEmail: { color: '#fff', fontSize: 14, fontWeight: '500' },
  accountSub: { color: '#4CAF50', fontSize: 12, marginTop: 2 },
  signOutText: { color: '#F44336', fontSize: 13, fontWeight: '600' },

  signInCard: { padding: 20 },
  signInTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 6 },
  signInSub: { color: '#888', fontSize: 13, lineHeight: 19, marginBottom: 20 },
  signInBtn: { backgroundColor: '#1A73E8', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  signInBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowContent: { flex: 1, marginRight: 8 },
  rowTitle: { color: '#fff', fontSize: 15 },
  rowDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  separator: { height: 1, backgroundColor: '#2C2C2C', marginLeft: 16 },

  uploadBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  statusText: { color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 10 },
  statusError: { color: '#F44336' },

  infoCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#1A73E8',
  },
  infoTitle: { color: '#90CAF9', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  infoText: { color: '#888', fontSize: 12, lineHeight: 18 },
  infoMono: { color: '#aaa', fontFamily: 'monospace' },
});
