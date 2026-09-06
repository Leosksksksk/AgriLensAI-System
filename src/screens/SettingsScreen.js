// src/screens/SettingsScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsScreen() {
  const { language, setLanguage, languages, languageLabels } = useLanguage();

  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [cameraQuality, setCameraQuality] = useState('High');
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);

  function selectLanguage(lang) {
    setLanguage(lang);
    setLanguagePickerVisible(false);
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
          <TouchableOpacity style={styles.row} onPress={() => setLanguagePickerVisible(true)} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Language</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{languageLabels[language]}</Text>
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

      <Modal
        visible={languagePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguagePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLanguagePickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Language</Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.modalOption}
                onPress={() => selectLanguage(lang)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    lang === language && styles.modalOptionTextActive,
                  ]}
                >
                  {languageLabels[lang]}
                </Text>
                {lang === language && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textLight, marginBottom: 8, marginTop: 12, letterSpacing: 0.5 },
  card: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16 },  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { fontSize: 15, color: colors.textDark },
  modalOptionTextActive: { color: colors.primary, fontWeight: '700' },
});