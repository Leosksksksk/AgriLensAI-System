// App.js
import React, { useEffect, useRef, useState } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Updates from 'expo-updates';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabaseClient';

import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { syncOfflineScans } from './src/services/syncService';
import BottomTabBar from './src/components/BottomTabBar';
import UpdateNotificationBanner from './src/components/UpdateNotificationBanner';
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
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
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
  const [updateVisible, setUpdateVisible] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkForUpdates() {
      try {
        if (__DEV__) return;

        const update = await Updates.checkForUpdateAsync({ branch: 'production' });

        if (update.isAvailable && isMounted) {
          const manifest = await Updates.fetchUpdateAsync();
          const critical = manifest?.manifest?.critical === true;
          setIsCritical(critical);
          setUpdateVisible(true);
        }
      } catch (error) {
        console.warn('Error checking for updates:', error);
      }
    }

    checkForUpdates();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const handleUpdateNow = () => {
    Updates.reloadAsync();
    setUpdateVisible(false);
  };

  const handleLater = () => {
    setUpdateVisible(false);
  };

  return (
    <UpdateNotificationBanner
      visible={updateVisible}
      isCritical={isCritical}
      onDismiss={handleLater}
      onUpdateNow={handleUpdateNow}
    />
  );
}

function AuthSyncTrigger() {
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSessionAndSync = async () => {
      try {
        const netInfo = await NetInfo.fetch();
        if (!netInfo?.isConnected) {
          return;
        }

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
        const message = error?.message || '';
        if (!message.includes('fetch failed') && !message.includes('Failed to connect')) {
          console.warn('Auth sync trigger error:', error);
        }
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

        const netInfo = await NetInfo.fetch();
        if (!netInfo?.isConnected) {
          wasOffline.current = true;
          return;
        }

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

function ThemedApp() {
  const { isLoading, isDark, colors } = useTheme();
  const { t } = useLanguage();

  if (isLoading) {
    return null;
  }

  const navigationTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: 'transparent',
      card: 'transparent',
      text: colors.textDark,
      border: colors.border,
      notification: colors.warning,
    },
  };

  return (
    <AppAlertProvider>
      <ImageBackground
        source={require('./assets/leaf-glass-background.jpg')}
        style={{ flex: 1 }}
        imageStyle={{ opacity: isDark ? 0.92 : 0.38 }}
        blurRadius={isDark ? 2 : 8}
        resizeMode="cover"
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: isDark ? 'rgba(5, 31, 32, 0.3)' : 'rgba(218, 241, 222, 0.42)' },
          ]}
        />
        <NavigationContainer theme={navigationTheme}>
        <StatusBar style="light" backgroundColor="transparent" translucent={true} />
        <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
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
      </ImageBackground>
    </AppAlertProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <UpdateNotifier />
        <AuthSyncTrigger />
        <NetworkSyncTrigger />
        <ThemedApp />
      </ThemeProvider>
    </LanguageProvider>
  );
}