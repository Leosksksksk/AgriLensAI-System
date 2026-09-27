// src/components/BottomTabBar.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../context/ThemeContext';
import { darkColors } from '../theme/colors';

const fallbackColors = darkColors;

const TABS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'Sync', label: 'Sync', icon: 'phone-portrait-outline', iconActive: 'phone-portrait' },
  { key: 'Alerts', label: 'Alerts', icon: 'notifications-outline', iconActive: 'notifications' },
  { key: 'Settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  { key: 'History', label: 'History', icon: 'time-outline', iconActive: 'time' },
];

export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index].name;
  const colors = useColors();
  const palette = colors ?? fallbackColors;

  return (
    <View style={[
      styles.container, 
      { 
        paddingBottom: insets.bottom + 10,
        backgroundColor: palette.card,
        borderTopColor: palette.border
      }
    ]}>
      {TABS.map((tab) => {
        const isActive = activeRouteName === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(tab.key)}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={24}
              color={isActive ? palette.primary : palette.textMuted}
            />
            <Text style={[
              styles.label, 
              { color: isActive ? palette.primary : palette.textMuted },
              isActive && styles.labelActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 2 
  },
  label: { 
    fontSize: 13, 
    marginTop: 2 
  },
  labelActive: { 
    fontWeight: '700' 
  },
});