// src/screens/SettingsScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';
import { t } from '../utils/translations';
import { useAppAlert } from '../context/AppAlertContext';

export default function SettingsScreen({ navigation }) {
  const { language, setLanguage, languages, languageLabels, resetLanguageSelection } = useLanguage();
  const { isDark, toggleTheme, colors } = useTheme();
  const Alert = useAppAlert();

  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [cameraQuality, setCameraQuality] = useState('High');
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function selectLanguage(lang) {
    setLanguage(lang);
    setLanguagePickerVisible(false);
  }

  function cycleCameraQuality() {
    const options = ['Low', 'Medium', 'High'];
    const idx = options.indexOf(cameraQuality);
    setCameraQuality(options[(idx + 1) % options.length]);
  }

  async function performLogOut() {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      await resetLanguageSelection();

      const rootNavigation = navigation.getParent() ?? navigation;
      rootNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LanguageSelect' }],
        })
      );
    } catch (e) {
      Alert.alert(t('logoutFailedTitle'), e.message ?? t('logoutFailedDesc'));
    } finally {
      setLoggingOut(false);
    }
  }

  function handleLogOut() {
    Alert.alert(t('logoutConfirmTitle'), t('logoutConfirmDesc'), [
      { text: t('cancelText'), style: 'cancel' },
      { text: t('logoutButtonText'), style: 'destructive', onPress: performLogOut },
    ]);
  }

  // Fetch app version from app.json config via expo-constants
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildVersion = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode;

  // STRICT FILTER: Only allow languages that actually exist and have a valid label
  const validLanguages = ['en', 'fil', 'ceb'].filter(
    (lang) => languageLabels && languageLabels[lang]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <Text style={[styles.headerTitle, { color: colors.white }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.row} onPress={() => setLanguagePickerVisible(true)} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.textDark }]}>Language</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textMuted }]}>{languageLabels[language] || 'ENGLISH'}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.textDark }]}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.textDark }]}>Offline Mode</Text>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.textDark }]}>{t('darkMode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.row} onPress={cycleCameraQuality} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.textDark }]}>Camera Quality</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textMuted }]}>{cameraQuality}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>APPLICATION</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textDark }]}>Version</Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>
              {appVersion}{buildVersion ? ` (${buildVersion})` : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled, { borderColor: colors.danger }]}
          onPress={handleLogOut}
          activeOpacity={0.8}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={languagePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguagePickerVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => setLanguagePickerVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.textDark }]}>Select Language</Text>
            {validLanguages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                onPress={() => selectLanguage(lang)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    lang === language && styles.modalOptionTextActive,
                    { color: lang === language ? colors.primary : colors.textDark }
                  ]}
                >
                  {languageLabels[lang]}
                </Text>
                {lang === language && (
                  <Ionicons name="checkmark" size={22} color={colors.primary} />
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
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 12, letterSpacing: 0.5 },
  card: { borderRadius: 14, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 15 },
  divider: { height: 1 },
  logoutBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutBtnDisabled: { opacity: 0.6 },
  logoutText: { fontWeight: '800', fontSize: 17 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 17 },
  modalOptionTextActive: { fontWeight: '700' },
});