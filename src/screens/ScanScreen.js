// src/screens/ScanScreen.js
import { saveScanOffline } from '../services/syncService';
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { analyzeLeaf } from '../services/aiEngineService';
import { enrichDiagnosis } from '../services/plantInfoLookupService';
import { enhanceDiagnosisWithWebSearch } from '../services/onlineImageSearchService';
import { getDueReminders, dismissReminder } from '../utils/reminderStorage';
import { getValidUserSession } from '../utils/auth';
import { useAppAlert } from '../context/AppAlertContext';

export default function ScanScreen({ navigation }) {
  const { language, languageLabels, t } = useLanguage();
  const { colors, isDark } = useTheme();
  const Alert = useAppAlert();

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
        Alert.alert(t('cameraPermissionTitle'), t('cameraPermissionDesc'));
        return;
      }
    }
    setShowCamera(true);
  }

  async function runAnalysis(uri) {
    setAnalyzing(true);
    setDiagnosis(null);
    setNotPlantWarning(false);
    try {
      const result = await analyzeLeaf(uri);

      if (result.isPlant === false) {
        setNotPlantWarning(true);
        setDiagnosis(null);
        return result;
      }

      let enrichedResult = result;
      if (isOnline) {
        try {
          enrichedResult = await enrichDiagnosis(result);
          
          enrichedResult = await enhanceDiagnosisWithWebSearch(enrichedResult);
        } catch (err) {
          console.log('Online enrichment skipped due to connection state, using local model result.');
        }
      }

      setDiagnosis(enrichedResult);
      return enrichedResult;
    } catch (e) {
      console.warn('Analysis error:', e);
      setDiagnosis(null);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }

  async function uploadAndSyncToSupabase(uri, diagnosisResult) {
    try {
      setUploading(true);

      if (!isOnline) {
        throw new Error('Network request failed (offline)');
      }

      const { user } = await getValidUserSession();
      if (!user) {
        throw new Error('No active session. Please log in again.');
      }

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

      const { error: dbError } = await supabase
        .from('scan_results')
        .insert([{
          image_url: publicUrl,
          crop_name: diagnosisResult?.cropName || 'Crop',
          status: 'Pending AI Analysis',
          farmer_id: user.id,
          disease_id: diagnosisResult?.diseaseId ?? null,
          damage_percent: diagnosisResult?.damagePercent ?? null,
          severity: diagnosisResult?.severity ?? null,
        }]);

      if (dbError) throw dbError;

      Alert.alert(t('syncSuccessTitle'), t('syncSuccessDesc'));
    } catch (error) {
      console.error('Supabase Sync Error:', error);

      const errorMsg = (error?.message || String(error)).toLowerCase();

      if (
        !isOnline ||
        errorMsg.includes('unknownhostexception') || 
        errorMsg.includes('network request failed') || 
        errorMsg.includes('fetch failed')
      ) {
        await saveScanOffline(uri, diagnosisResult);
        Alert.alert(
          t('savedOfflineTitle'), 
          t('savedOfflineDesc')
        );
      } else {
        Alert.alert(
          t('uploadFailedTitle'), 
          t('uploadFailedGeneric')
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleImageReady(uri) {
    setImageUri(uri);
    const result = await runAnalysis(uri);

    if (!result || result.isPlant === false) {
      Alert.alert(t('notAPlantTitle'), t('notAPlantDesc'));
      return;
    }

    uploadAndSyncToSupabase(uri, result);
  }

  async function handleUploadPhoto() {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      Alert.alert(t('photoPermissionTitle'), t('photoPermissionDesc'));
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
      Alert.alert(t('noPhotoTitle'), t('noPhotoDesc'));
      return;
    }
    if (!isOnline) {
      Alert.alert(t('noInternet'), t('scanRequiresInternet'));
      return;
    }
    if (analyzing) {
      Alert.alert(t('analyzingTitle'), t('analyzingDesc'));
      return;
    }
    if (notPlantWarning) {
      Alert.alert(t('notAPlantTitle'), t('notAPlantDesc'));
      return;
    }
    if (!diagnosis) {
      Alert.alert(t('analysisUnavailableTitle'), t('analysisUnavailableDesc'));
      return;
    }
    navigation.navigate('Results', { imageUri, diagnosis });
  }

  async function handleOfflineAnalyze() {
    if (!imageUri) {
      Alert.alert(t('noPhotoTitle'), t('noPhotoDesc'));
      return;
    }
    if (analyzing) {
      Alert.alert(t('analyzingTitle'), t('analyzingDesc'));
      return;
    }
    if (notPlantWarning) {
      Alert.alert(t('notAPlantTitle'), t('notAPlantDesc'));
      return;
    }

    const result = await runAnalysis(imageUri);

    if (!result || result.isPlant === false) {
      Alert.alert(t('notAPlantTitle'), t('notAPlantDesc'));
      return;
    }

    navigation.navigate('Results', { imageUri, diagnosis: result });
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef} />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setShowCamera(false)}>
            <Text style={[styles.cameraCancelText, { color: colors.white }]}>{t('cameraCancelText')}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <Text style={[styles.headerTitle, { color: colors.white }]}>{t('appName')}</Text>
        <TouchableOpacity style={[styles.langPill, { backgroundColor: colors.white }]}>
          <Text style={[styles.langPillText, { color: colors.primaryDark }]}>{languageLabels[language]}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {dueReminders.map((reminder) => (
          <View key={reminder.id} style={[styles.reminderBanner, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="notifications" size={20} color={colors.warning} />
            <Text style={[styles.reminderBannerText, { color: colors.textDark }]}>
              {reminder.diseaseName}
            </Text>
            <TouchableOpacity onPress={() => handleDismissReminder(reminder.id)}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={[styles.viewfinder, { backgroundColor: colors.mint }]}>
          {!isOnline && (
            <View style={[styles.offlineBadge, { backgroundColor: colors.warning }]}>
              <Text style={[styles.offlineBadgeText, { color: colors.white }]}>{t('noInternet')}</Text>
            </View>
          )}
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
            />
          ) : (
            <>
              <View style={[styles.cornerTL, { borderColor: isDark ? colors.white : colors.primaryDark }]} />
              <View style={[styles.cornerTR, { borderColor: isDark ? colors.white : colors.primaryDark }]} />
              <View style={[styles.cornerBL, { borderColor: isDark ? colors.white : colors.primaryDark }]} />
              <View style={[styles.cornerBR, { borderColor: isDark ? colors.white : colors.primaryDark }]} />
              <View style={[styles.viewfinderHintWrap, { backgroundColor: colors.mint }]}>
                <Text style={[styles.viewfinderHint, { color: colors.textDark }]}>{t('pointCamera')}</Text>
              </View>
            </>
          )}
          {analyzing && (
            <View style={[styles.analyzingOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <ActivityIndicator color={colors.white} />
              <Text style={[styles.analyzingText, { color: colors.white }]}>{t('analyzingImage')}</Text>
            </View>
          )}
          {!analyzing && notPlantWarning && (
            <View style={[styles.notPlantOverlay, { backgroundColor: colors.danger }]}>
              <Ionicons name="alert-circle" size={18} color={colors.white} />
              <Text style={[styles.notPlantText, { color: colors.white }]}>{t('notAPlantBanner')}</Text>
            </View>
          )}
        </View>

        {/* UPLOAD & TAKE PHOTO BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: '#26482D', backgroundColor: '#112214' }]} activeOpacity={0.85} onPress={handleUploadPhoto} disabled={uploading}>
            <Text style={styles.outlineBtnText}>{uploading ? t('uploadingText') : t('uploadPhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filledBtn, { backgroundColor: '#2E7D32' }]} activeOpacity={0.85} onPress={handleTakePhoto} disabled={uploading}>
            <Text style={styles.filledBtnText}>{t('takePhoto')}</Text>
          </TouchableOpacity>
        </View>

        {/* MAIN SCAN BUTTON */}
        <TouchableOpacity style={[styles.scanBtn, { backgroundColor: '#4CAF50' }]} activeOpacity={0.85} onPress={handleAnalyze}>
          <Text style={styles.scanBtnText}>{t('scanLeafBtn')}</Text>
        </TouchableOpacity>

        {/* OFFLINE AI BUTTON */}
        <TouchableOpacity style={[styles.analyzeBtn, { backgroundColor: '#112214', borderColor: '#1da038' }]} activeOpacity={0.85} onPress={handleOfflineAnalyze}>
          <Ionicons name="sparkles" size={18} color="#A2E0A2" style={{ marginRight: 8 }} />
          <Text style={styles.analyzeBtnText}>{t('analyzeOffline')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  langPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  langPillText: { fontWeight: '700', fontSize: 14 },
  body: { padding: 20, paddingBottom: 40 },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  reminderBannerText: { flex: 1, fontSize: 15, fontWeight: '600' },
  viewfinder: {
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 2,
  },
  offlineBadgeText: { fontSize: 13, fontWeight: '700' },
  viewfinderHintWrap: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  viewfinderHint: { fontSize: 15, fontWeight: '600' },
  analyzingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  analyzingText: { fontSize: 14, fontWeight: '600' },
  notPlantOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },  //camera frames
  notPlantText: { fontSize: 14, fontWeight: '700' },
  cornerTL: { position: 'absolute', top: 20, left: 20, width: 26, height: 26, borderTopWidth: 0.4, borderLeftWidth: 0.4 }, //upper left corner
  cornerTR: { position: 'absolute', top: 20, right: 20, width: 26, height: 26, borderTopWidth: 0.4, borderRightWidth: 0.4 }, //upper right corner
  cornerBL: { position: 'absolute', bottom: 20, left: 20, width: 26, height: 26, borderBottomWidth: 0.4, borderLeftWidth: 0.4 }, //lower left corner
  cornerBR: { position: 'absolute', bottom: 20, right: 20, width: 26, height: 26, borderBottomWidth: 0.4, borderRightWidth: 0.4 }, //lower right corner
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },

  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  filledBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  filledBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  scanBtn: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  scanBtnText: { color: '#09150B', fontWeight: '800', fontSize: 17 },

  analyzeBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeBtnText: { color: '#A2E0A2', fontWeight: '800', fontSize: 16 },

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
  cameraCancelText: { fontSize: 17 },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 54, height: 54, borderRadius: 27 },
});