import React, { useEffect, useState } from 'react';
import { AppState, Image, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppLockScreen } from './src/screens/AppLockScreen';
import { TheftTrack } from './src/utils/NativeTheftTrack';

export default function App() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    Promise.all([TheftTrack.isFirstLaunch(), TheftTrack.getAppLock()])
      .then(([first, appLock]) => {
        setShowOnboarding(first);
        setLocked(appLock.enabled);
        setReady(true);
      })
      .catch(() => {
        setShowOnboarding(false);
        setLocked(false);
        setReady(true);
      });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async next => {
      if (next === 'active') {
        const { enabled } = await TheftTrack.getAppLock();
        if (enabled) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Image source={require('./src/imgs/app_logo.png')} style={styles.splashLogo} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      {locked && <AppLockScreen onUnlock={() => setLocked(false)} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
});
