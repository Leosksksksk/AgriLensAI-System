// src/screens/ScanScreen.js
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../supabaseClient';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { analyzeLeaf } from '../services/aiEngineService';
import { getDueReminders, dismissReminder } from '../utils/reminderStorage';

export default function ScanScreen({ navigation }) {
  const { language, languageLabels, t } = useLanguage();

  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [notPlantWarning, setNotPlantWarning] = useState(false);
  const cameraRef = useRef(null);
  const [dueReminders, setDueReminders] = useState([]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setIsOnline(!!state.isConnected));
    return unsub;
  }, []);

  useEffect(() => {
    getDueReminders().then(setDueReminders);
  }, []);

  async function handleDismissReminder(id) {
    await dismissReminder(id);
    setDueReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleTakePhoto() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera permission needed', 'Enable camera access to scan a leaf.');
        return;
      }
    }
    setShowCamera(true);
  }

  // Runs the real, on-device pixel analysis, including the plant-detection
  // gate. Returns the result directly so the caller can decide whether to
  // proceed with upload/navigation without depending on stale React state.
  async function runAnalysis(uri) {
    setAnalyzing(true);
    setDiagnosis(null);
    setNotPlantWarning(false);
    try {
      const result = await analyzeLeaf(uri);
      if (result.isPlant === false) {
        setNotPlantWarning(true);
        setDiagnosis(null);
      } else {
        setDiagnosis(result);
      }
      return result;
    } catch (e) {
      console.warn('Analysis error:', e);
      setDiagnosis(null);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }

  // Helper function to handle the Supabase storage upload and database sync
  async function uploadAndSyncToSupabase(uri, diagnosisResult) {
    try {
      setUploading(true);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decode(base64);

      const filename = `agrilens_scan_${Date.now()}.jpg`;

      const { error: storageError } = await supabase.storage
        .from('scans')
        .upload(filename, arrayBuffer, { contentType: 'image/jpeg' });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from('scans')
        .getPublicUrl(filename);

      const publicUrl = publicUrlData.publicUrl;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session. Please log in again.');

      const { error: dbError } = await supabase
        .from('scan_results')
        .insert([{
          image_url: publicUrl,
          status: 'Pending AI Analysis',
          farmer_id: user.id,
          disease_id: diagnosisResult?.diseaseId ?? null,
          damage_percent: diagnosisResult?.damagePercent ?? null,
          severity: diagnosisResult?.severity ?? null,
        }]);

      if (dbError) throw dbError;

      Alert.alert('Synced!', 'Image successfully saved to Supabase bucket and database.');
    } catch (error) {
      console.error('Supabase Sync Error:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleImageReady(uri) {
    setImageUri(uri);
    const result = await runAnalysis(uri);

    if (!result || result.isPlant === false) {
      // Don't waste storage/bandwidth uploading a non-plant photo, and
      // don't let the farmer proceed to a meaningless diagnosis.
      Alert.alert(t('notAPlantTitle'), t('notAPlantDesc'));
      return;
    }

    uploadAndSyncToSupabase(uri, result);
  }

  async function handleUploadPhoto() {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      Alert.alert('Photo library permission needed', 'Enable photo access to select a leaf photo.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!picked.canceled && picked.assets?.length) {
      handleImageReady(picked.assets[0].uri);
    }
  }

  function handleAnalyze() {
    if (!imageUri) {
      Alert.alert('No photo yet', 'Take or upload a leaf photo first.');
      return;
    }
    if (analyzing) {
      Alert.alert('Still analyzing', 'Please wait a moment while we finish analyzing your leaf photo.');
      return;
    }
    if (notPlantWarning) {
      Alert.alert(t('notAPlantTitle'), t('notAPlantDesc'));
      return;
    }
    if (!diagnosis) {
      Alert.alert('Analysis unavailable', 'Could not analyze this photo. Please try again with a clearer image.');
      return;
    }
    navigation.navigate('Results', { imageUri, diagnosis });
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef} />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.cameraCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captureBtn}
            disabled={uploading}
            onPress={async () => {
              if (cameraRef.current) {
                try {
                  const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
                  setShowCamera(false);
                  if (photo?.uri) {
                    handleImageReady(photo.uri);
                  }
                } catch (err) {
                  console.error('Capture error:', err);
                  setShowCamera(false);
                }
              }
            }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
          <View style={{ width: 70 }} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appName')}</Text>
        <TouchableOpacity style={styles.langPill}>
          <Text style={styles.langPillText}>{languageLabels[language]}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {dueReminders.map((reminder) => (
          <View key={reminder.id} style={styles.reminderBanner}>
            <Ionicons name="notifications" size={18} color={colors.warning} />
            <Text style={styles.reminderBannerText}>
              {reminder.diseaseName} — {reminder.cropLabel}
            </Text>
            <TouchableOpacity onPress={() => handleDismissReminder(reminder.id)}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.viewfinder}>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>{t('noInternet')}</Text>
            </View>
          )}
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
            />
          ) : (
            <>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
              <Text style={styles.viewfinderHint}>{t('pointCamera')}</Text>
            </>
          )}
          {analyzing && (
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.analyzingText}>{t('analyzingImage')}</Text>
            </View>
          )}
          {!analyzing && notPlantWarning && (
            <View style={styles.notPlantOverlay}>
              <Ionicons name="alert-circle" size={16} color={colors.white} />
              <Text style={styles.notPlantText}>{t('notAPlantBanner')}</Text>
            </View>
          )}
        </View>

        {/* UPLOAD & TAKE PHOTO BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.85} onPress={handleUploadPhoto} disabled={uploading}>
            <Text style={styles.outlineBtnText}>{uploading ? 'Uploading...' : t('uploadPhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filledBtn} activeOpacity={0.85} onPress={handleTakePhoto} disabled={uploading}>
            <Text style={styles.filledBtnText}>{t('takePhoto')}</Text>
          </TouchableOpacity>
        </View>

        {/* MAIN SCAN BUTTON */}
        <TouchableOpacity style={styles.scanBtn} activeOpacity={0.85} onPress={handleAnalyze}>
          <Text style={styles.scanBtnText}>{t('scanLeafBtn')}</Text>
        </TouchableOpacity>

        {/* OFFLINE AI BUTTON */}
        <TouchableOpacity style={styles.analyzeBtn} activeOpacity={0.85} onPress={handleAnalyze}>
          <Ionicons name="sparkles" size={16} color="#A2E0A2" style={{ marginRight: 8 }} />
          <Text style={styles.analyzeBtnText}>{t('analyzeOffline')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  langPill: { backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  langPillText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  body: { padding: 20, paddingBottom: 40 },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  reminderBannerText: { flex: 1, fontSize: 13, color: colors.textDark, fontWeight: '600' },
  viewfinder: {
    backgroundColor: '#0E1F13',
    borderRadius: 14,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%' },
  offlineBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 2,
  },
  offlineBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  viewfinderHint: { color: '#8FA893', fontSize: 13 },
  analyzingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  analyzingText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  notPlantOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  notPlantText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  cornerTL: { position: 'absolute', top: 20, left: 20, width: 26, height: 26, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.white },
  cornerTR: { position: 'absolute', top: 20, right: 20, width: 26, height: 26, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.white },
  cornerBL: { position: 'absolute', bottom: 20, left: 20, width: 26, height: 26, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: colors.white },
  cornerBR: { position: 'absolute', bottom: 20, right: 20, width: 26, height: 26, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.white },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },

  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#26482D',
    backgroundColor: '#112214',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  filledBtn: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  filledBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  scanBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  scanBtnText: { color: '#09150B', fontWeight: '800', fontSize: 15 },

  analyzeBtn: {
    backgroundColor: '#112214',
    borderWidth: 1,
    borderColor: '#26482D',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeBtnText: { color: '#A2E0A2', fontWeight: '800', fontSize: 14 },

  cameraControls: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  cameraCancelBtn: { width: 70 },
  cameraCancelText: { color: colors.white, fontSize: 15 },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.white },
});