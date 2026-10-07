// src/theme/colors.js
export const lightColors = {
  primaryDark: '#051F20',
  primary: '#235347',
  primaryLight: '#8EB69B',
  stepIconGreen: '#8EB69B',
  leafGreen: '#235347',
  mint: '#8EB69B',

  background: 'rgba(218, 241, 222, 0.56)',
  card: 'rgba(244, 251, 245, 0.92)',

  textDark: '#163832',
  textMuted: '#235347',
  textLight: '#163832',

  warning: '#F5A623',
  warningBg: '#FFF7E6',
  danger: '#E53935',
  dangerBg: '#FDECEA',
  info: '#1565C0',
  infoBg: '#E8F0FE',
  ok: '#235347',
  okBg: '#DAF1DE',

  border: '#8EB69B',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors = {
  primaryDark: '#051F20',
  primary: '#8EB69B',
  primaryLight: '#DAF1DE',
  stepIconGreen: '#8EB69B',
  leafGreen: '#8EB69B',
  mint: '#163832',

  background: 'rgba(5, 31, 32, 0.64)',
  card: 'rgba(11, 43, 38, 0.78)',

  textDark: '#DAF1DE',
  textMuted: '#8EB69B',
  textLight: '#DAF1DE',

  warning: '#FFB74D',
  warningBg: '#3A2E1A',
  danger: '#EF5350',
  dangerBg: '#3A1A1A',
  info: '#64B5F6',
  infoBg: '#1A2A3A',
  ok: '#8EB69B',
  okBg: '#163832',

  border: '#235347',
  white: '#FFFFFF',
  black: '#000000',
};

export const glassPopupTheme = {
  surface: 'rgba(20, 35, 25, 0.88)',
  border: 'rgba(255, 255, 255, 0.15)',
  text: '#F4F8F4',
  muted: '#D4E8D4',
  accent: '#A8D5A2',
  iconSurface: 'rgba(255, 255, 255, 0.08)',
};

export const colors = darkColors;

export function severityColor(level, isDark = true) {
  const palette = isDark ? darkColors : lightColors;
  switch ((level || '').toLowerCase()) {
    case 'healthy':
      return palette.ok;
    case 'mild':
      return palette.leafGreen;
    case 'moderate':
      return palette.warning;
    case 'severe':
      return palette.danger;
    default:
      return palette.textMuted;
  }
}

export function riskColor(level, isDark = true) {
  const palette = isDark ? darkColors : lightColors;
  switch ((level || '').toLowerCase()) {
    case 'high risk':
    case 'high':
      return palette.danger;
    case 'moderate risk':
    case 'moderate':
      return palette.warning;
    case 'low risk':
    case 'low':
      return palette.ok;
    default:
      return palette.textMuted;
  }
}

export default { lightColors, darkColors, severityColor, riskColor };