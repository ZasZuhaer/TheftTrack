export interface IntrusionLog {
  id: string;
  timestamp: number;
  frontPhoto: string;
  backPhoto: string;
  latitude: number;
  longitude: number;
  address: string;
  emailSent: boolean;
  failedAttempts: number;
}

export interface AppSettings {
  email: string;
  password: string;
  recipient: string;
  threshold: number;
  enabled: boolean;
  locationEnabled: boolean;
  frontShots: number;
  backShots: number;
  watermarkEnabled: boolean;
}

export interface AppLock {
  enabled: boolean;
  pin: string;
}

export type SettingsStackParamList = {
  SettingsList: undefined;
  Email: undefined;
  FailedAttempts: undefined;
  Pictures: undefined;
  DeviceAdmin: undefined;
  ManagePermissions: undefined;
  AppLock: undefined;
  TestCapture: undefined;
};
