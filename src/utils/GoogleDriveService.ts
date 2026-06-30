import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP REQUIRED
// Replace this placeholder with your Web Client ID from Google Cloud Console.
//
// Steps:
//   1. Go to https://console.cloud.google.com/ and create a project.
//   2. Enable the Google Drive API for that project.
//   3. Go to Credentials → Create Credentials → OAuth 2.0 Client ID.
//      a. Create an Android client (package: com.thefttrack, SHA-1 of your keystore).
//         Debug SHA-1: run →  keytool -list -v -keystore android/app/debug.keystore
//                             -alias androiddebugkey -storepass android -keypass android
//      b. Create a Web application client (needed for access tokens on Android).
//   4. Copy the WEB client ID below.
// ─────────────────────────────────────────────────────────────────────────────
export const GOOGLE_WEB_CLIENT_ID = '443421395947-5ad7v8qtq81546hm5vcrckv8cv799v6h.apps.googleusercontent.com';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export function isConfigured(): boolean {
  return GOOGLE_WEB_CLIENT_ID !== 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
}

export function configure() {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: [DRIVE_SCOPE],
    offlineAccess: false,
  });
}

export async function signIn() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  return GoogleSignin.signIn();
}

export async function signOut() {
  await GoogleSignin.revokeAccess();
  await GoogleSignin.signOut();
}

export function getCurrentUser() {
  return GoogleSignin.getCurrentUser();
}

export async function getAccessToken(): Promise<string> {
  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
}

export { statusCodes };
