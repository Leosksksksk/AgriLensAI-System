// src/screens/IntroScreen.js
import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

export default function IntroScreen({ navigation }) {
  const { t, hasSelectedLanguage, isLoading } = useLanguage();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 2 }
    ).start();

    const timer = setTimeout(() => {
      if (isLoading) return; // wait for AsyncStorage check to finish before routing
      navigation.replace(hasSelectedLanguage ? 'Login' : 'LanguageSelect');
    }, 3200);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scanAnim, hasSelectedLanguage, isLoading]);

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-70, 70],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.phoneBody}>
          <View style={styles.phoneNotch} />

          <View style={styles.phoneScreen}>
            <View style={styles.plantContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoInPhone}
                resizeMode="contain"
              />
            </View>

            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanTranslateY }] },
              ]}
            />
          </View>
        </View>

        <Text style={styles.appName}>{t('appName')}</Text>
        <Text style={styles.tagline}>{t('scanningCropHealth')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  phoneBody: {
    width: 140,
    height: 240,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#0A1C10',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  phoneNotch: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  phoneScreen: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#0E2414',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  plantContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInPhone: {
    width: 70,
    height: 70,
  },
  scanLine: {
    position: 'absolute',
    width: '90%',
    height: 3,
    backgroundColor: '#4CD964',
    borderRadius: 2,
    shadowColor: '#4CD964',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    color: '#DCEEDC',
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.5,
  },
});