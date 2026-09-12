// src/components/BottomTabBar.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
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
              size={22}
              color={isActive ? colors.primary : colors.textLight}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  labelActive: { color: colors.primary, fontWeight: '700' },
});
