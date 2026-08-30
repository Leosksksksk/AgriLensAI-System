// src/theme/colors.js
export const colors = {
  primaryDark: '#1B5E20',
  primary: '#2E7D32',
  primaryLight: '#43A047',
  leafGreen: '#4CAF50',
  mint: '#E8F5E9',

  background: '#F5F7F5',
  card: '#FFFFFF',

  textDark: '#1A1A1A',
  textMuted: '#6B7A6E',
  textLight: '#9AA79C',

  warning: '#F5A623',
  warningBg: '#FFF7E6',
  danger: '#E53935',
  dangerBg: '#FDECEA',
  info: '#1565C0',
  infoBg: '#E8F0FE',
  ok: '#2E7D32',
  okBg: '#E8F5E9',

  border: '#E4E9E4',
  white: '#FFFFFF',
  black: '#000000',
};

export function severityColor(level) {
  switch ((level || '').toLowerCase()) {
    case 'healthy':
      return colors.ok;
    case 'mild':
      return colors.leafGreen;
    case 'moderate':
      return colors.warning;
    case 'severe':
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

export function riskColor(level) {
  switch ((level || '').toLowerCase()) {
    case 'high risk':
    case 'high':
      return colors.danger;
    case 'moderate risk':
    case 'moderate':
      return colors.warning;
    case 'low risk':
    case 'low':
      return colors.ok;
    default:
      return colors.textMuted;
  }
}

export default colors;
