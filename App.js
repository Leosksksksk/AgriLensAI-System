// App.js
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import BottomTabBar from './src/components/BottomTabBar';
import IntroScreen from './src/screens/IntroScreen';
import LoginScreen from './src/screens/LoginScreen';
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

function MainTabs({ language, onChangeLanguage }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home">
        {(props) => <ScanScreen {...props} language={language} />}
      </Tab.Screen>
      <Tab.Screen name="Sync" component={SyncScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Settings">
        {(props) => (
          <SettingsScreen {...props} language={language} onChangeLanguage={onChangeLanguage} />
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [language, setLanguage] = useState('En');

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTabs">
          {(props) => (
            <MainTabs {...props} language={language} onChangeLanguage={setLanguage} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="TreatmentPlan" component={TreatmentPlanScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}