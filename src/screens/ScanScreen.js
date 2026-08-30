// src/screens/ScanScreen.js
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../theme/colors';
import { t, LANGUAGE_LABELS } from '../utils/translations';

export default function ScanScreen({ navigation, language = 'English' }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setIsOnline(!!state.isConnected));
    return unsub;
  }, []);

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

  async function handleUploadPhoto() {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      Alert.alert('Photo library permission needed', 'Enable photo access to select a leaf photo.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!picked.canceled && picked.assets?.length) {
      setImageUri(picked.assets[0].uri);
    }
  }

  function handleAnalyze() {
    if (!imageUri) {
      Alert.alert('No photo yet', 'Take or upload a leaf photo first.');
      return;
    }
    // Runs 100% on-device — navigate to results with mock/derived diagnosis.
    navigation.navigate('Results', { imageUri });
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.cameraCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={() => {
              setShowCamera(false);
              setImageUri('captured-leaf-placeholder');
            }}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <View style={{ width: 70 }} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appName', language)}</Text>
                <TouchableOpacity style={styles.langPill}>
          <Text style={styles.langPillText}>{LANGUAGE_LABELS[language]}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.viewfinder}>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>{t('noInternet', language)}</Text>
            </View>
          )}
          {imageUri ? (
            <Image
              source={imageUri === 'captured-leaf-placeholder' ? undefined : { uri: imageUri }}
              style={styles.previewImage}
            />
          ) : (
            <>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
              <Text style={styles.viewfinderHint}>{t('pointCamera', language)}</Text>
            </>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.85} onPress={handleUploadPhoto}>
            <Text style={styles.outlineBtnText}>{t('uploadPhoto', language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filledBtn} activeOpacity={0.85} onPress={handleTakePhoto}>
            <Text style={styles.filledBtnText}>{t('takePhoto', language)}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.scanBtn} activeOpacity={0.85} onPress={handleAnalyze}>
          <Text style={styles.scanBtnText}>{t('scanLeafBtn', language)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.analyzeBtn} activeOpacity={0.85} onPress={handleAnalyze}>
          <Ionicons name="sparkles" size={16} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.analyzeBtnText}>{t('analyzeOffline', language)}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 54,
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
  cornerTL: { position: 'absolute', top: 20, left: 20, width: 26, height: 26, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.white },
  cornerTR: { position: 'absolute', top: 20, right: 20, width: 26, height: 26, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.white },
  cornerBL: { position: 'absolute', bottom: 20, left: 20, width: 26, height: 26, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: colors.white },
  cornerBR: { position: 'absolute', bottom: 20, right: 20, width: 26, height: 26, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.white },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  filledBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  filledBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  scanBtn: { backgroundColor: colors.leafGreen, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  scanBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  analyzeBtn: {
    backgroundColor: '#123A18',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
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
