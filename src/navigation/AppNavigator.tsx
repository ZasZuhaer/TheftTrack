import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { LogsScreen } from '../screens/LogsScreen';
import { SettingsNavigator } from './SettingsNavigator';
import { HomeIcon, LogsIcon, SettingsIcon } from '../components/NavIcons';

const Tab = createBottomTabNavigator();

const ACTIVE = '#4FC3F7';
const INACTIVE = '#555';

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333',
          height: 56,
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
        tabBarIconStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'TheftTrack',
          tabBarIcon: ({ focused }) => (
            <HomeIcon color={focused ? ACTIVE : INACTIVE} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Logs"
        component={LogsScreen}
        options={{
          title: 'Intrusion Logs',
          tabBarIcon: ({ focused }) => (
            <LogsIcon color={focused ? ACTIVE : INACTIVE} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <SettingsIcon color={focused ? ACTIVE : INACTIVE} size={24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
