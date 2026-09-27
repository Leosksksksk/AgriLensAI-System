// src/theme/colors.js
export const lightColors = {
  primaryDark: '#094a0df3',
  primary: '#2E7D32',
  primaryLight: '#43A047',
  stepIconGreen: '#6FCF74',
  leafGreen: '#0b950b',
  mint: '#E8F5E9',

  background: '#EBF5EB',
  card: '#FFFFFF',

  textDark: '#2E3A2E',
  textMuted: '#5A6B5A',
  textLight: '#4A5A4A',

  warning: '#F5A623',
  warningBg: '#FFF7E6',
  danger: '#E53935',
  dangerBg: '#FDECEA',
  info: '#1565C0',
  infoBg: '#E8F0FE',
  ok: '#2E7D32',
  okBg: '#E8F5E9',

  border: '#D4E4D4',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors = {
  primaryDark: '#094a0df3',
  primary: '#4CAF50',
  primaryLight: '#66BB6A',
  stepIconGreen: '#6FCF74',
  leafGreen: '#4CAF50',
  mint: '#1B3A1B',

  background: '#042804',
  card: '#0D3D0D',

  textDark: '#E8F0E8',
  textMuted: '#A8C0A8',
  textLight: '#C8D8C8',

  warning: '#FFB74D',
  warningBg: '#3A2E1A',
  danger: '#EF5350',
  dangerBg: '#3A1A1A',
  info: '#64B5F6',
  infoBg: '#1A2A3A',
  ok: '#81C784',
  okBg: '#1B3A1B',

  border: '#2E4A2E',
  white: '#FFFFFF',
  black: '#000000',
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