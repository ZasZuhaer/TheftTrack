import { NativeModules } from 'react-native';
import type { AppSettings, IntrusionLog } from '../types';

const { TheftTrackModule } = NativeModules;

if (!TheftTrackModule) {
  console.warn('TheftTrackModule native module not found — Android only');
}

export const TheftTrack = {
  isDeviceAdminActive: (): Promise<boolean> =>
    TheftTrackModule.isDeviceAdminActive(),

  requestDeviceAdmin: (): void =>
    TheftTrackModule.requestDeviceAdmin(),

  removeDeviceAdmin: (): Promise<boolean> =>
    TheftTrackModule.removeDeviceAdmin(),

  getSettings: (): Promise<AppSettings> =>
    TheftTrackModule.getSettings(),

  saveSettings: (
    email: string,
    password: string,
    recipient: string,
    threshold: number,
    enabled: boolean
  ): Promise<boolean> =>
    TheftTrackModule.saveSettings(email, password, recipient, threshold, enabled),

  getIntrusionLogs: (): Promise<IntrusionLog[]> =>
    TheftTrackModule.getIntrusionLogs(),

  clearIntrusionLogs: (): Promise<boolean> =>
    TheftTrackModule.clearIntrusionLogs(),

  triggerTestCapture: (): Promise<boolean> =>
    TheftTrackModule.triggerTestCapture(),

  getFailedCount: (): Promise<number> =>
    TheftTrackModule.getFailedCount(),

  resetFailedCount: (): Promise<boolean> =>
    TheftTrackModule.resetFailedCount(),
};
