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
import { analyzeLeafPixels } from '../services/aiEngineService';
import {
  preprocessImageForModel,
  runAutoCropInference,
} from '../utils/aiService';
import { enrichDiagnosis } from '../services/plantInfoLookupService';
import { getDueReminders, dismissReminder } from '../utils/reminderStorage';
import { getValidUserSession } from '../utils/auth';
import { useAppAlert } from '../context/AppAlertContext';
import { glassPopupTheme } from '../theme/colors';

const CROP_NAMES_BY_ID = {
  corn: 'Corn',
  pepper: 'Pepper',
  potato: 'Potato',
  tomato: 'Tomato',
};

/**
 * Fast non-plant validation using local heuristic analysis.
 * Runs synchronously on the image without TFLite models.
 * Returns { isPlant: boolean, reason?: string }
 */
async function validatePlantContent(uri) {
  try {
    const inputTensor = await preprocessImageForModel(uri);
    const heuristicAnalysis = analyzeLeafPixels(inputTensor);
    return {
      isPlant: heuristicAnalysis.isPlant,
      reason: heuristicAnalysis.reason || (heuristicAnalysis.isPlant ? 'plant_detected' : 'not_plant'),
    };
  } catch (error) {
    console.warn('Validation error, assuming plant:', error);
    // On validation error, assume it's a plant to not block legitimate scans
    return { isPlant: true, reason: 'validation_error' };
  }
}

export default function ScanScreen({ navigation, route }) {
  const { language, languageLabels, t } = useLanguage();
  const { colors, isDark } = useTheme();
  const Alert = useAppAlert();

  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingOffline, setIsAnalyzingOffline] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const cameraRef = useRef(null);
  const scanRequestId = useRef(0);
  const [dueReminders, setDueReminders] = useState([]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(connected);
      if (connected) setShowOfflineNotice(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    getDueReminders().then(setDueReminders);
  }, []);

  useEffect(() => {
    const pendingPickerUri = route?.params?.pendingPickerUri;
    if (!pendingPickerUri) return;

    navigation.setParams({ pendingPickerUri: null });
    // Run validation on pending picker URI as well
    validatePlantContent(pendingPickerUri).then(({ isPlant, reason }) => {
      if (!isPlant) {
        Alert.alert(
          'Not a Plant',
          'The captured photo does not appear to be a plant. Please take a clear photo of a leaf. This image will not sync to Supabase.'
        );
        setImageUri(null);
        setDiagnosis(null);
        setShowOfflineNotice(false);
        return;
      }
      setImageUri(pendingPickerUri);
      setDiagnosis(null);
      setShowOfflineNotice(false);
    }).catch((error) => {
      console.warn('Validation error on pending URI, proceeding:', error);
      setImageUri(pendingPickerUri);
      setDiagnosis(null);
      setShowOfflineNotice(false);
    });
  }, [route?.params?.pendingPickerUri]);

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

  async function runAnalysis(uri, onEstimate) {
    let localEstimate = {
      isPlant: true,
      cropName: 'Plant',
      diseaseId: 'leafSpot',
      damagePercent: 0,
      severity: 'None',
      confidence: 0,
      isBestFit: true,
    };

    try {
      const inputTensor = await preprocessImageForModel(uri);
      const heuristicAnalysis = analyzeLeafPixels(inputTensor);
      
      // Handle non-plant detection
      if (!heuristicAnalysis.isPlant) {
        return {
          ...localEstimate,
          isPlant: false,
          cropName: 'Not a Plant',
          diseaseId: 'notPlant',
          damagePercent: 0,
          severity: 'None',
          confidence: 0.05,
          isBestFit: false,
          heuristicReason: heuristicAnalysis.reason || 'unknown',
        };
      }

      // Determine if healthy (damage is essentially 0)
      const isHealthy = heuristicAnalysis.damagePercent <= 0.5; // threshold for healthy
      
      localEstimate = {
        ...localEstimate,
        diseaseId: isHealthy ? 'healthy' : 'leafSpot',
        damagePercent: heuristicAnalysis.damagePercent,
        severity: heuristicAnalysis.severity === 'Unknown' ? 'None' : heuristicAnalysis.severity,
        confidence: heuristicAnalysis.isPlant ? 0.25 : 0.05,
      };
      onEstimate?.(localEstimate);

      const prediction = await runAutoCropInference(inputTensor);
      const refinedResult = {
        ...localEstimate,
        cropName: CROP_NAMES_BY_ID[prediction.cropType] || 'Plant',
        diseaseId: prediction.diseaseId === 'unknownCrop' ? localEstimate.diseaseId : prediction.diseaseId,
        confidence: prediction.confidence,
        isBestFit: prediction.isBestFit || false,
      };
      onEstimate?.(refinedResult);
      return refinedResult;
    } catch (error) {
      console.warn('Using local scan estimate:', error);
      onEstimate?.(localEstimate);
      return localEstimate;
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
          status: diagnosisResult?.diseaseId ? 'Analysis Complete' : 'Pending AI Analysis',
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

  async function handleImageReady(uri, { syncResult = true, allowOffline = false, actionType = 'analyze' } = {}) {
    setImageUri(uri);
    setShowOfflineNotice(false);
    setDiagnosis(null);
    if (!isOnline && !allowOffline) return;

    const scanId = ++scanRequestId.current;
    
    // Set the appropriate loading state based on action type
    if (actionType === 'analyze') {
      setIsAnalyzing(true);
    } else {
      setIsAnalyzingOffline(true);
    }
    
    try {
      let resultsOpened = false;
      const publishEstimate = (result) => {
        if (scanId !== scanRequestId.current) return;
        setDiagnosis(result);
        if (!resultsOpened) {
          resultsOpened = true;
          navigation.navigate('Results', { imageUri: uri, diagnosis: result, scanId });
          return;
        }

        const parentNavigation = navigation.getParent();
        const state = parentNavigation?.getState();
        const currentRoute = state?.routes?.[state.index];
        if (currentRoute?.name === 'Results' && currentRoute.params?.scanId === scanId) {
          parentNavigation.setParams({ diagnosis: result });
        }
      };

      const result = await runAnalysis(uri, publishEstimate);
      if (scanId !== scanRequestId.current) return;
      setDiagnosis(result);
      if (!resultsOpened) {
        navigation.navigate('Results', { imageUri: uri, diagnosis: result, scanId });
      }
      
      // Only sync to Supabase if it's a plant and syncResult is true
      const shouldSync = syncResult && result.isPlant !== false;
      if (shouldSync) void uploadAndSyncToSupabase(uri, result);

      if (isOnline) {
        // Prepare diagnosis for enrichment based on result type
        let lookupDiagnosis = result;
        if (!result.isPlant) {
          // Non-plant: skip Wikipedia lookup entirely
          lookupDiagnosis = null;
        } else if (result.diseaseId === 'healthy' && result.damagePercent > 0) {
          lookupDiagnosis = { ...result, diseaseId: 'plantDiseaseOverview' };
        }
        
        if (lookupDiagnosis) {
          void enrichDiagnosis(lookupDiagnosis, language)
            .then((enrichedResult) => {
              const parentNavigation = navigation.getParent();
              const state = parentNavigation?.getState();
              const currentRoute = state?.routes?.[state.index];
              if (currentRoute?.name === 'Results' && currentRoute.params?.scanId === scanId) {
                parentNavigation.setParams({
                  diagnosis: { ...result, onlineInfo: enrichedResult.onlineInfo },
                });
              }
            })
            .catch((error) => console.warn('Wikipedia reference lookup failed:', error));
        }
      }
    } finally {
      // Always reset the appropriate loading state
      if (actionType === 'analyze') {
        setIsAnalyzing(false);
      } else {
        setIsAnalyzingOffline(false);
      }
    }
  }

  function showImagePreview(uri) {
    // Run instant plant validation before showing preview
    validatePlantContent(uri).then(({ isPlant, reason }) => {
      if (!isPlant) {
        // Non-plant detected: show immediate alert and clear image state
        Alert.alert(
          t('notAPlantAlertTitle'),
          t('notAPlantAlertMessage')
        );
        // Clear any existing image to prevent invalid preview
        setImageUri(null);
        setDiagnosis(null);
        setShowOfflineNotice(false);
        return;
      }
      // Plant detected: proceed with normal preview
      setImageUri(uri);
      setDiagnosis(null);
      setShowOfflineNotice(false);
    }).catch((error) => {
      console.warn('Validation error, proceeding with preview:', error);
      // On validation error, proceed with preview (fail-open)
      setImageUri(uri);
      setDiagnosis(null);
      setShowOfflineNotice(false);
    });
  }

  async function handleUploadPhoto() {
    try {
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

      if (picked.canceled) return;
      const croppedUri = picked.assets?.[0]?.uri;
      if (croppedUri) showImagePreview(croppedUri);
    } catch (error) {
      console.error('Photo selection or cropping failed:', error);
    }
  }

  function handleAnalyze() {
    if (!imageUri) {
      Alert.alert(t('noPhotoTitle'), t('noPhotoDesc'));
      return;
    }
    if (!isOnline) {
      setShowOfflineNotice(true);
      return;
    }
    setShowOfflineNotice(false);
    if (diagnosis) {
      navigation.navigate('Results', { imageUri, diagnosis });
      return;
    }
    void handleImageReady(imageUri, { syncResult: false, actionType: 'analyze' });
  }

  function handleOfflineAnalyze() {
    if (!imageUri) {
      Alert.alert(t('noPhotoTitle'), t('noPhotoDesc'));
      return;
    }
    setShowOfflineNotice(false);
    void handleImageReady(imageUri, { syncResult: false, allowOffline: true, actionType: 'offline' });
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
                    showImagePreview(photo.uri);
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
      <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textDark }]}>{t('appName')}</Text>
          <TouchableOpacity style={[styles.langPill, { backgroundColor: colors.white }]}>
            <Text style={[styles.langPillText, { color: colors.primaryDark }]}>{languageLabels[language]}</Text>
          </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {dueReminders.map((reminder) => (
          <View key={reminder.id} style={styles.reminderBanner}>
            <Ionicons name="notifications" size={20} color={colors.warning} />
            <Text style={[styles.reminderBannerText, { color: glassPopupTheme.text }]}>
              {reminder.diseaseName}
            </Text>
            <TouchableOpacity onPress={() => handleDismissReminder(reminder.id)}>
              <Ionicons name="close" size={20} color={glassPopupTheme.muted} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={[styles.viewfinder, { backgroundColor: colors.mint, borderColor: colors.border }]}>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Text style={[styles.offlineBadgeText, { color: glassPopupTheme.text }]}>{t('noInternet')}</Text>
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
              <View style={styles.viewfinderHintWrap}>
                <Text style={[styles.viewfinderHint, { color: colors.textDark }]}>{t('pointCamera')}</Text>
              </View>
            </>
          )}
        </View>

        {/* UPLOAD & TAKE PHOTO BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.85}
            onPress={handleUploadPhoto}
            disabled={uploading}
          >
            <Text style={[styles.outlineBtnText, { color: colors.textDark }]}>
              {uploading ? t('uploadingText') : t('uploadPhoto')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filledBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={handleTakePhoto}
            disabled={uploading}
          >
            <Text style={[styles.filledBtnText, { color: isDark ? colors.primaryDark : colors.white }]}>
              {t('takePhoto')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? <ActivityIndicator color={isDark ? colors.primaryDark : colors.white} /> : (
            <Text style={[styles.scanBtnText, { color: isDark ? colors.primaryDark : colors.white }]}>{t('scanLeafBtn')}</Text>
          )}
        </TouchableOpacity>

        {showOfflineNotice && (
          <View style={[styles.offlineNotice, { backgroundColor: `${colors.warning}1A`, borderColor: colors.warning }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text style={[styles.offlineNoticeText, { color: colors.textDark }]}>{t('scanOfflineMessage')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.analyzeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.85}
          onPress={handleOfflineAnalyze}
          disabled={isAnalyzingOffline}
        >
          {isAnalyzingOffline ? <ActivityIndicator color={colors.primaryLight} /> : (
            <>
              <Ionicons name="sparkles" size={18} color={colors.primaryLight} style={{ marginRight: 8 }} />
              <Text style={[styles.analyzeBtnText, { color: colors.textDark }]}>{t('analyzeOffline')}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
//homescreen area
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: 'transparent',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  langPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  langPillText: { fontWeight: '700', fontSize: 14 },
  body: { padding: 20, paddingBottom: 40 },
  reminderBanner: {
    backgroundColor: glassPopupTheme.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: glassPopupTheme.border,
    borderRadius: 16,
    padding: 20,
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
    borderWidth: 1,
    shadowColor: '#092516',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  previewImage: { width: '100%', height: '100%' },
  offlineBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: glassPopupTheme.surface,
    borderWidth: 1,
    borderColor: glassPopupTheme.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 2,
  },
  offlineBadgeText: { fontSize: 13, fontWeight: '700' },
  viewfinderHintWrap: { paddingHorizontal: 12, paddingVertical: 8 },
  viewfinderHint: { fontSize: 15, fontWeight: '600' },
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
  outlineBtnText: { fontWeight: '700', fontSize: 15 },
  filledBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  filledBtnText: { fontWeight: '700', fontSize: 15 },
  scanBtn: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanBtnText: { fontWeight: '800', fontSize: 17 },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  offlineNoticeText: { flex: 1, fontSize: 14, lineHeight: 19 },
  analyzeBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeBtnText: { fontWeight: '800', fontSize: 16 },

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