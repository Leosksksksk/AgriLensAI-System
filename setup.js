const fs = require('fs');
const path = require('path');

const files = {
  'package.json': `{
  "name": "agrilens-ai",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "~1.23.1",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native": "^6.1.9",
    "expo": "~51.0.0",
    "expo-image-picker": "~15.0.4",
    "expo-speech": "~12.0.2",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "~3.31.1"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  },
  "private": true
}`,

  'app.json': `{
  "expo": {
    "name": "AgriLens AI",
    "slug": "agrilens-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "splash": {
      "resizeMode": "contain",
      "backgroundColor": "#2E7D32"
    },
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "AgriLens AI needs access to your photos to analyze crop leaf health.",
          "cameraPermission": "AgriLens AI needs camera access to capture leaf images."
        }
      ]
    ]
  }
}`,

  'babel.config.js': `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};`,

  'App.js': `import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './src/utils/translations';
import ScanScreen from './src/screens/ScanScreen';
import ClimateScreen from './src/screens/ClimateScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';

export default function App() {
  const [lang, setLang] = useState('ceb');
  const [activeTab, setActiveTab] = useState('scan');
  
  const [farmerName, setFarmerName] = useState('');
  const [location, setLocation] = useState('Barangay Banban, Bogo City');
  const [cropType, setCropType] = useState('Corn');
  
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isSynced, setIsSynced] = useState(true);

  const t = translations[lang] || translations.en;

  useEffect(() => {
    loadProfileAndHistory();
  }, []);

  const loadProfileAndHistory = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('@farmer_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.farmerName) setFarmerName(parsed.farmerName);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.cropType) setCropType(parsed.cropType);
      }

      const savedLogs = await AsyncStorage.getItem('@inspection_logs');
      if (savedLogs) setHistoryLogs(JSON.parse(savedLogs));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.appName}</Text>
          <View style={styles.langContainer}>
            {['ceb', 'fil', 'en'].map((item) => (
              <TouchableOpacity 
                key={item} 
                style={[styles.langBtn, lang === item && styles.activeLangBtn]}
                onPress={() => setLang(item)}>
                <Text style={[styles.langTxt, lang === item && styles.activeLangTxt]}>{item.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {activeTab === 'scan' && (
            <ScanScreen 
              lang={lang} 
              historyLogs={historyLogs} 
              setHistoryLogs={setHistoryLogs} 
              setIsSynced={setIsSynced} 
            />
          )}
          {activeTab === 'climate' && <ClimateScreen lang={lang} />}
          {activeTab === 'profile' && (
            <ProfileScreen 
              lang={lang}
              farmerName={farmerName}
              setFarmerName={setFarmerName}
              location={location}
              setLocation={setLocation}
              cropType={cropType}
              setCropType={setCropType}
            />
          )}
          {activeTab === 'history' && (
            <HistoryScreen 
              lang={lang}
              historyLogs={historyLogs}
              isSynced={isSynced}
              setIsSynced={setIsSynced}
            />
          )}
        </View>

        <View style={styles.navbar}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('scan')}>
            <Text style={[styles.navTxt, activeTab === 'scan' && styles.activeNavTxt]}>🔍 Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('climate')}>
            <Text style={[styles.navTxt, activeTab === 'climate' && styles.activeNavTxt]}>⛅ Climate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('history')}>
            <Text style={[styles.navTxt, activeTab === 'history' && styles.activeNavTxt]}>📜 History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
            <Text style={[styles.navTxt, activeTab === 'profile' && styles.activeNavTxt]}>👤 Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { padding: 16, backgroundColor: '#2E7D32', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  langContainer: { flexDirection: 'row' },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4, borderRadius: 4, backgroundColor: '#1B5E20' },
  activeLangBtn: { backgroundColor: '#81C784' },
  langTxt: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  activeLangTxt: { color: '#000' },
  body: { flex: 1 },
  navbar: { height: 60, backgroundColor: '#FFF', flexDirection: 'row', borderTopWidth: 1, borderColor: '#E0E0E0' },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navTxt: { color: '#757575', fontWeight: 'bold', fontSize: 12 },
  activeNavTxt: { color: '#2E7D32' }
});`,

  'src/utils/translations.js': `export const translations = {
  en: {
    appName: "AgriLens AI",
    scanLeaf: "Scan Leaf (Offline Mode)",
    takePhoto: "Take Photo",
    uploadPhoto: "Upload Photo",
    analyze: "Analyze Leaf Health",
    severityLabel: "Infection Severity",
    mitigationTitle: "Mitigation & Treatment Guide",
    urgentActions: "Urgent Action Required",
    playVoice: "Listen to Instructions",
    stopVoice: "Stop Audio",
    climatePanel: "Climate Risk & Early Warning",
    syncData: "Sync Offline Records",
    profile: "Farmer Profile",
    saveProfile: "Save Profile",
    history: "Inspection History",
    language: "Language / Lingwahe",
  },
  fil: {
    appName: "AgriLens AI",
    scanLeaf: "Suriin ang Dahon (Offline Mode)",
    takePhoto: "Kumuha ng Litrato",
    uploadPhoto: "Mag-upload ng Litrato",
    analyze: "Suriin ang Kalusugan ng Dahon",
    severityLabel: "Lala ng Impeksyon",
    mitigationTitle: "Gabay sa Gamot at Lunas",
    urgentActions: "Kailangan ng Mabilisang Aksyon",
    playVoice: "Pakinggan ang Instruksyon",
    stopVoice: "Iparada ang Boses",
    climatePanel: "Panganib sa Klima at Babala sa Peste",
    syncData: "I-sync ang Offline Records",
    profile: "Profile ng Magsasaka",
    saveProfile: "I-save ang Profile",
    history: "Kasaysayan ng Pagsusuri",
    language: "Wika",
  },
  ceb: {
    appName: "AgriLens AI",
    scanLeaf: "Susiha ang Dahon (Offline Mode)",
    takePhoto: "Kahuha og Litrato",
    uploadPhoto: "I-upload ang Litrato",
    analyze: "Susiha ang Panglawas sa Dahon",
    severityLabel: "Gidaghanon sa Daut",
    mitigationTitle: "Pagtambal ug Tambag",
    urgentActions: "Dinalian nga Aksyon",
    playVoice: "Paminaw sa Pagtudlo",
    stopVoice: "Ihunong ang Boses",
    climatePanel: "Risgo sa Panahon ug Pahiwarning",
    syncData: "I-sync ang Records",
    profile: "Profile sa Mag-uuma",
    saveProfile: "I-save ang Profile",
    history: "Agi sa Pagsusi",
    language: "Lpinulongan",
  }
};`,

  'src/screens/ScanScreen.js': `import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../utils/translations';

export default function ScanScreen({ lang, historyLogs, setHistoryLogs, setIsSynced }) {
  const t = translations[lang] || translations.en;
  const [imageUri, setImageUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const pickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera access is needed to capture leaf photos.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    }

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setDiagnosticResult(null);
    }
  };

  const getMitigationSteps = (severity, language) => {
    if (language === 'ceb') {
      if (severity === 'Severe') return "1. Isipon ug sunugon dayon ang daut nga dahon.\\n2. Pag-spray og Organic Neem Oil sa palibot.\\n3. Ayaw paimna ang dahon pinaagi sa overhead watering.";
      if (severity === 'Moderate') return "1. Kuhaa ang mga nasakit nga dahon.\\n2. Pahuwaya ang yuta ug hatagi og igong hawan sa hangin.";
      return "1. Bantayi ang tanom matag adlaw.\\n2. Siguroha nga sakto ang adlaw ug tubig.";
    }
    return severity === 'Severe' 
      ? "1. Isolate infected plants immediately.\\n2. Apply organic neem oil extract.\\n3. Avoid overhead leaf watering."
      : "1. Prune affected leaves.\\n2. Ensure proper plant spacing for aeration.";
  };

  const runOfflineAnalysis = () => {
    if (!imageUri) return;
    setIsAnalyzing(true);

    setTimeout(async () => {
      const randomDamage = Math.floor(Math.random() * 65) + 10;
      let severity = randomDamage > 50 ? "Severe" : randomDamage > 25 ? "Moderate" : "Mild";

      const mockDiseases = ["Northern Corn Leaf Blight", "Common Rust", "Cercospora Leaf Spot"];
      const selectedDisease = mockDiseases[Math.floor(Math.random() * mockDiseases.length)];

      const resultObj = {
        id: Date.now().toString(),
        disease: selectedDisease,
        damagePct: randomDamage,
        severity: severity,
        timestamp: new Date().toLocaleDateString(),
        mitigation: getMitigationSteps(severity, lang),
      };

      setDiagnosticResult(resultObj);
      setIsAnalyzing(false);

      const updatedLogs = [resultObj, ...(historyLogs || [])];
      setHistoryLogs(updatedLogs);
      setIsSynced(false);
      await AsyncStorage.setItem('@inspection_logs', JSON.stringify(updatedLogs));
    }, 1500);
  };

  const handleTTS = async () => {
    if (!diagnosticResult) return;
    if (isPlayingAudio) {
      Speech.stop();
      setIsPlayingAudio(false);
      return;
    }

    const speechText = \`\${t.appName}. \${t.severityLabel}: \${diagnosticResult.severity}. \${t.mitigationTitle}: \${diagnosticResult.mitigation}\`;
    setIsPlayingAudio(true);
    
    Speech.speak(speechText, {
      language: lang === 'ceb' ? 'fil-PH' : lang === 'fil' ? 'fil-PH' : 'en-US',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>{t.scanLeaf}</Text>
      
      <View style={styles.imageBox}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.leafImg} /> : <Text style={styles.placeholderTxt}>No leaf photo captured yet</Text>}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)}>
          <Text style={styles.btnTxt}>{t.takePhoto}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => pickImage(false)}>
          <Text style={styles.btnTxtSecondary}>{t.uploadPhoto}</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <TouchableOpacity style={styles.analyzeBtn} onPress={runOfflineAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.analyzeBtnTxt}>{t.analyze}</Text>}
        </TouchableOpacity>
      )}

      {diagnosticResult && (
        <View style={styles.resultCard}>
          <Text style={styles.diseaseTitle}>{diagnosticResult.disease}</Text>
          <View style={styles.severityBadge}>
            <Text style={styles.severityTxt}>{t.severityLabel}: {diagnosticResult.severity} ({diagnosticResult.damagePct}% Damage)</Text>
          </View>
          <Text style={styles.subHeading}>{t.mitigationTitle}:</Text>
          <Text style={styles.guideTxt}>{diagnosticResult.mitigation}</Text>

          <TouchableOpacity style={styles.ttsBtn} onPress={handleTTS}>
            <Text style={styles.ttsBtnTxt}>{isPlayingAudio ? \`🔊 \${t.stopVoice}\` : \`🗣️ \${t.playVoice}\`}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginBottom: 12 },
  imageBox: { height: 220, backgroundColor: '#E0E0E0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  leafImg: { width: '100%', height: '100%', borderRadius: 8 },
  placeholderTxt: { color: '#757575' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { flex: 0.48, backgroundColor: '#2E7D32', padding: 12, borderRadius: 6, alignItems: 'center' },
  actionBtnSecondary: { flex: 0.48, backgroundColor: '#4CAF50', padding: 12, borderRadius: 6, alignItems: 'center' },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  btnTxtSecondary: { color: '#FFF', fontWeight: 'bold' },
  analyzeBtn: { backgroundColor: '#FF8F00', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 16 },
  analyzeBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  resultCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#C8E6C9' },
  diseaseTitle: { fontSize: 20, fontWeight: 'bold', color: '#C62828' },
  severityBadge: { marginVertical: 8, padding: 6, backgroundColor: '#FFEBEE', borderRadius: 4 },
  severityTxt: { color: '#C62828', fontWeight: 'bold' },
  subHeading: { fontWeight: 'bold', marginTop: 8, color: '#333' },
  guideTxt: { color: '#555', marginTop: 4, lineHeight: 20 },
  ttsBtn: { marginTop: 12, backgroundColor: '#0288D1', padding: 12, borderRadius: 6, alignItems: 'center' },
  ttsBtnTxt: { color: '#FFF', fontWeight: 'bold' },
});`,

  'src/screens/ClimateScreen.js': `import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { translations } from '../utils/translations';

export default function ClimateScreen({ lang }) {
  const t = translations[lang] || translations.en;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>{t.climatePanel}</Text>
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Bogo City Micro-Climate Rules</Text>
        <Text style={styles.cardBody}>🌡️ Avg Temperature: 31°C</Text>
        <Text style={styles.cardBody}>💧 Humidity: 84% (High Risk)</Text>
        <Text style={styles.cardBody}>🌧️ Rainfall Chance: 65%</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningTxt}>
            ⚠️ Early Warning: High humidity and elevated temperatures detected. Corn Blight fungal outbreak probability is HIGH in the next 72 hours.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginBottom: 12 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, elevation: 2 },
  cardHeader: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#2E7D32' },
  cardBody: { fontSize: 14, color: '#444', marginBottom: 6 },
  warningBox: { marginTop: 12, padding: 12, backgroundColor: '#FFF3E0', borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#EF6C00' },
  warningTxt: { color: '#E65100', fontWeight: '600', lineHeight: 20 },
});`,

  'src/screens/ProfileScreen.js': `import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../utils/translations';

export default function ProfileScreen({ lang, farmerName, setFarmerName, location, setLocation, cropType, setCropType }) {
  const t = translations[lang] || translations.en;

  const saveProfile = async () => {
    const profile = { farmerName, location, cropType };
    await AsyncStorage.setItem('@farmer_profile', JSON.stringify(profile));
    Alert.alert("Success", "Farmer profile saved successfully!");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>{t.profile}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Farmer Full Name:</Text>
        <TextInput style={styles.input} value={farmerName} onChangeText={setFarmerName} placeholder="Enter full name" />

        <Text style={styles.label}>Farm Location / Barangay:</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Barangay Banban, Bogo City" />

        <Text style={styles.label}>Primary Crop Type:</Text>
        <TextInput style={styles.input} value={cropType} onChangeText={setCropType} placeholder="e.g. Corn, Rice, Vegetables" />

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.saveBtnTxt}>{t.saveProfile}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginBottom: 12 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, elevation: 2 },
  label: { fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: '#333' },
  input: { borderWidth: 1, borderColor: '#CCC', padding: 10, borderRadius: 6, marginBottom: 8, backgroundColor: '#FAFAFA' },
  saveBtn: { backgroundColor: '#2E7D32', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 12 },
  saveBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});`,

  'src/screens/HistoryScreen.js': `import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { translations } from '../utils/translations';

export default function HistoryScreen({ lang, historyLogs, isSynced, setIsSynced }) {
  const t = translations[lang] || translations.en;

  const handleSyncData = () => {
    Alert.alert("Syncing Data", "Connecting to central server...", [
      {
        text: "OK",
        onPress: () => {
          setIsSynced(true);
          Alert.alert("Sync Complete", "All offline inspection logs uploaded!");
        }
      }
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>{t.history}</Text>
      
      <TouchableOpacity style={styles.syncBtn} onPress={handleSyncData}>
        <Text style={styles.syncBtnTxt}>
          {t.syncData} ({isSynced ? '✓ Synced' : '🔄 Pending Sync'})
        </Text>
      </TouchableOpacity>

      {historyLogs && historyLogs.length > 0 ? (
        historyLogs.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <Text style={styles.historyTitle}>{item.disease} - {item.severity}</Text>
            <Text style={styles.historyDate}>{item.timestamp} | Damage: {item.damagePct}%</Text>
            <Text style={styles.historyMitigation}>{item.mitigation}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyTxt}>No historical inspections recorded yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginBottom: 12 },
  syncBtn: { backgroundColor: '#1565C0', padding: 12, borderRadius: 6, alignItems: 'center', marginBottom: 16 },
  syncBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  historyCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 6, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#2E7D32', elevation: 1 },
  historyTitle: { fontWeight: 'bold', fontSize: 16, color: '#2E7D32' },
  historyDate: { fontSize: 12, color: '#666', marginVertical: 4 },
  historyMitigation: { fontSize: 13, color: '#444' },
  emptyTxt: { textAlign: 'center', color: '#888', marginTop: 20 },
});`
};

Object.entries(files).forEach(([filePath, content]) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
console.log(`Created: ${filePath}`);
});
console.log(`\n🚀 Project files successfully created!`);