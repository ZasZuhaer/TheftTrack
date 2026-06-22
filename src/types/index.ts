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
}

export type SettingsStackParamList = {
  SettingsList: undefined;
  Email: undefined;
  FailedAttempts: undefined;
  Pictures: undefined;
  DeviceAdmin: undefined;
  CameraPermission: undefined;
  LocationPermission: undefined;
  NotificationPermission: undefined;
};
