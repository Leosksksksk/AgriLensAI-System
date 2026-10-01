// src/components/BottomTabBar.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { darkColors } from '../theme/colors';

const fallbackColors = darkColors;

const TABS = [
  { key: 'Home', translationKey: 'tabHome', icon: 'home-outline', iconActive: 'home' },
  { key: 'Sync', translationKey: 'tabSync', icon: 'phone-portrait-outline', iconActive: 'phone-portrait' },
  { key: 'Alerts', translationKey: 'tabAlerts', icon: 'notifications-outline', iconActive: 'notifications' },
  { key: 'Settings', translationKey: 'tabSettings', icon: 'settings-outline', iconActive: 'settings' },
  { key: 'Profile', translationKey: 'tabProfile', icon: 'person-outline', iconActive: 'person' },
  { key: 'History', translationKey: 'tabHistory', icon: 'time-outline', iconActive: 'time' },
];

export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index].name;
  const colors = useColors();
  const { t } = useLanguage();
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
            accessibilityLabel={t(tab.translationKey)}
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
            ]}
              numberOfLines={1}
            >
              {t(tab.translationKey)}
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
    minWidth: 0,
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 2 
  },
  label: { 
    width: '100%',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center'
  },
  labelActive: { 
    fontWeight: '700' 
  },
});