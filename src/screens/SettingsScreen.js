// src/screens/SettingsScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { LANGUAGES, LANGUAGE_LABELS } from '../utils/translations';

export default function SettingsScreen({ language = 'English', onChangeLanguage = () => {} }) {
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [cameraQuality, setCameraQuality] = useState('High');

  function cycleLanguage() {
    const idx = LANGUAGES.indexOf(language);
    onChangeLanguage(LANGUAGES[(idx + 1) % LANGUAGES.length]);
  }

  function cycleCameraQuality() {
    const options = ['Low', 'Medium', 'High'];
    const idx = options.indexOf(cameraQuality);
    setCameraQuality(options[(idx + 1) % options.length]);
  }

  function handleLogOut() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => {} },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={cycleLanguage} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Language</Text>
            </View>
                      <View style={styles.rowRight}>
            <Text style={styles.rowValue}>{LANGUAGE_LABELS[language]}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Offline Mode</Text>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={cycleCameraQuality} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Camera Quality</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{cameraQuality}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>APPLICATION</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogOut} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textLight, marginBottom: 8, marginTop: 12, letterSpacing: 0.5 },
  card: { backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14, color: colors.textDark, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
});
