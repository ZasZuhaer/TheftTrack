import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SettingsEmailScreen } from '../screens/SettingsEmailScreen';
import { SettingsFailedAttemptsScreen } from '../screens/SettingsFailedAttemptsScreen';
import { SettingsPicturesScreen } from '../screens/SettingsPicturesScreen';
import { SettingsDeviceAdminScreen } from '../screens/SettingsDeviceAdminScreen';
import { SettingsManagePermissionsScreen } from '../screens/SettingsManagePermissionsScreen';
import { SettingsAppLockScreen } from '../screens/SettingsAppLockScreen';
import { SettingsTestCaptureScreen } from '../screens/SettingsTestCaptureScreen';
import { SettingsVideoScreen } from '../screens/SettingsVideoScreen';
import { SettingsGoogleDriveScreen } from '../screens/SettingsGoogleDriveScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

const HEADER = {
  headerStyle: { backgroundColor: '#1A1A1A' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
  contentStyle: { backgroundColor: '#121212' },
};

export function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="SettingsList" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Email" component={SettingsEmailScreen} options={{ title: 'Email' }} />
      <Stack.Screen name="FailedAttempts" component={SettingsFailedAttemptsScreen} options={{ title: 'Failed Attempts' }} />
      <Stack.Screen name="Pictures" component={SettingsPicturesScreen} options={{ title: 'Pictures' }} />
      <Stack.Screen name="DeviceAdmin" component={SettingsDeviceAdminScreen} options={{ title: 'Device Admin' }} />
      <Stack.Screen name="ManagePermissions" component={SettingsManagePermissionsScreen} options={{ title: 'Manage Permissions' }} />
      <Stack.Screen name="AppLock" component={SettingsAppLockScreen} options={{ title: 'App Lock' }} />
      <Stack.Screen name="TestCapture" component={SettingsTestCaptureScreen} options={{ title: 'Test Capture' }} />
      <Stack.Screen name="VideoSettings" component={SettingsVideoScreen} options={{ title: 'Video Capture' }} />
      <Stack.Screen name="GoogleDrive" component={SettingsGoogleDriveScreen} options={{ title: 'Google Drive' }} />
    </Stack.Navigator>
  );
}
