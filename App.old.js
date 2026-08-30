import { useState, useEffect } from 'react';
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
});