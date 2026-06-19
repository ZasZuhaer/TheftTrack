import { NativeModules } from 'react-native';
import type { AppSettings, IntrusionLog } from '../types';

const mod = NativeModules.TheftTrackModule;

// Wraps a native call so that: (a) a missing module returns the default value,
// and (b) a sync throw (method not yet in the installed binary) becomes a
// resolved/rejected promise instead of an unhandled exception.
function call<T>(fn: () => T, fallback: T): Promise<T> {
  try {
    if (!mod) return Promise.resolve(fallback);
    return Promise.resolve(fn());
  } catch {
    return Promise.resolve(fallback);
  }
}

export const TheftTrack = {
  isDeviceAdminActive: (): Promise<boolean> =>
    call(() => mod.isDeviceAdminActive(), false),

  requestDeviceAdmin: (): void => {
    try { mod?.requestDeviceAdmin(); } catch {}
  },

  removeDeviceAdmin: (): Promise<boolean> =>
    call(() => mod.removeDeviceAdmin(), false),

  getSettings: (): Promise<AppSettings> =>
    call(() => mod.getSettings(), {
      email: '', password: '', recipient: '', threshold: 3, enabled: false,
    }),

  saveSettings: (
    email: string,
    password: string,
    recipient: string,
    threshold: number,
    enabled: boolean,
  ): Promise<boolean> =>
    call(() => mod.saveSettings(email, password, recipient, threshold, enabled), false),

  getIntrusionLogs: (): Promise<IntrusionLog[]> =>
    call(() => mod.getIntrusionLogs(), []),

  clearIntrusionLogs: (): Promise<boolean> =>
    call(() => mod.clearIntrusionLogs(), false),

  triggerTestCapture: (): Promise<boolean> =>
    call(() => mod.triggerTestCapture(), false),

  getFailedCount: (): Promise<number> =>
    call(() => mod.getFailedCount(), 0),

  resetFailedCount: (): Promise<boolean> =>
    call(() => mod.resetFailedCount(), false),

  isFirstLaunch: (): Promise<boolean> =>
    call(() => mod.isFirstLaunch(), false),

  markOnboardingComplete: (): Promise<boolean> =>
    call(() => mod.markOnboardingComplete(), false),

  saveRecipientEmail: (email: string): Promise<boolean> =>
    call(() => mod.saveRecipientEmail(email), false),
};
