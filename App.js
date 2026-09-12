// App.js
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Updates from 'expo-updates';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabaseClient';

import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { syncOfflineScans } from './src/services/syncService';
import BottomTabBar from './src/components/BottomTabBar';
import IntroScreen from './src/screens/IntroScreen';
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import LoginScreen from './src/screens/LoginScreen';
import OtpVerifyScreen from './src/screens/OtpVerifyScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ScanScreen from './src/screens/ScanScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import TreatmentPlanScreen from './src/screens/TreatmentPlanScreen';
import ClimateScreen from './src/screens/ClimateScreen';
import SyncScreen from './src/screens/SyncScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={ScanScreen} />
      <Tab.Screen name="Sync" component={SyncScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}

function UpdateNotifier() {
  const { t } = useLanguage();

  useEffect(() => {
    async function checkForUpdates() {
      try {
        if (__DEV__) return;

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          
          Alert.alert(
            t('updateAvailableTitle'),
            t('updateAvailableDesc'),
            [
              {
                text: t('updateNow'),
                onPress: () => Updates.reloadAsync(),
              },
            ],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.warn('Error checking for updates:', error);
      }
    }

    checkForUpdates();
  }, [t]);

  return null;
}

function AuthSyncTrigger() {
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSessionAndSync = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !synced && isMounted) {
          console.log('User session detected, triggering offline scan sync...');
          const result = await syncOfflineScans({ requireAuth: true });
          if (result.attempted) {
            console.log(`Auth-triggered sync complete: ${result.synced} synced, ${result.failed} failed`);
          }
          setSynced(true);
        }
      } catch (error) {
        console.warn('Auth sync trigger error:', error);
      }
    };

    checkSessionAndSync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !synced && isMounted) {
        console.log('User signed in, triggering offline scan sync...');
        syncOfflineScans({ requireAuth: true }).then(result => {
          if (result.attempted) {
            console.log(`Sign-in triggered sync complete: ${result.synced} synced, ${result.failed} failed`);
          }
        });
        setSynced(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [synced]);

  return null;
}

function NetworkSyncTrigger() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && wasOffline.current) {
        console.log('Internet restored! Checking for offline scans to sync...');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Active session found, triggering background sync...');
          const result = await syncOfflineScans({ requireAuth: true });
          if (result.attempted) {
            console.log(`Network-restored sync complete: ${result.synced} synced, ${result.failed} failed`);
          }
        } else {
          console.log('No active session, skipping background sync. Will sync when user logs in.');
        }
      }
      
      wasOffline.current = !state.isConnected;
    });

    return () => unsubscribe();
  }, []);

  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <UpdateNotifier />
      <AuthSyncTrigger />
      <NetworkSyncTrigger />
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="TreatmentPlan" component={TreatmentPlanScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}