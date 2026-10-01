// src/components/DevUpdateMenu.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAppAlert } from '../context/AppAlertContext';

export default function DevUpdateMenu({ visible, onClose }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const Alert = useAppAlert();

  if (!visible) {
    return null;
  }

  const handleTestCritical = () => {
    if (Platform.OS === 'web') {
      Linking.openURL('https://expo.dev/accounts/[your-account]/projects/agrilens-ai/updates');
    } else {
      Alert.alert('Run in terminal:', 'npm run update:test:critical');
    }
    onClose();
  };

  const handleTestNormal = () => {
    Alert.alert('Run in terminal:', 'npm run update:test:normal');
    onClose();
  };

  const handleRollback = () => {
    Alert.alert('Run in terminal:', 'npm run update:rollback');
    onClose();
  };

  return (
    <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
      <View style={[styles.menu, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textDark }]}>Dev Update Menu</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textDark} /></TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.item, { backgroundColor: colors.danger + '1A' }]} onPress={handleTestCritical} activeOpacity={0.7}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} style={{ marginRight: 12 }} />
          <Text style={[styles.itemText, { color: colors.danger }]}>Test Critical Update (--critical)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, { backgroundColor: colors.primary + '1A' }]} onPress={handleTestNormal} activeOpacity={0.7}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
          <Text style={[styles.itemText, { color: colors.primary }]}>Test Normal Update</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, { backgroundColor: colors.warning + '1A' }]} onPress={handleRollback} activeOpacity={0.7}>
          <Ionicons name="refresh-circle" size={20} color={colors.warning} style={{ marginRight: 12 }} />
          <Text style={[styles.itemText, { color: colors.warning }]}>Rollback Preview</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  menu: { width: '90%', maxWidth: 400, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 10 },
  itemText: { fontSize: 15, fontWeight: '600', flex: 1 },
});

export { styles };