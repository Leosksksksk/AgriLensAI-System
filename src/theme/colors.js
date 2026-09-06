// src/theme/colors.js
export const colors = {
  primaryDark: '#094a0df3', //dashboard above
  primary: '#2E7D32',
  primaryLight: '#43A047',
  leafGreen: '#0b950b', //scan leaf padding
  mint: '#E8F5E9',

  background: '#042804',  //background
  card: '#FFFFFF',

  textDark: '#797070', //sync texts
  textMuted: '#7a786b', //sync sub-texts
  textLight: '#7a867f', //dashboard texts

  warning: '#F5A623',
  warningBg: '#FFF7E6',
  danger: '#E53935',
  dangerBg: '#FDECEA',
  info: '#1565C0',
  infoBg: '#E8F0FE', //pending and info card background
  ok: '#55ef5d', //reminder and tomato leaf logo
  okBg: '#E8F5E9',

  border: '#E4E9E4',
  white: '#034c08', //borders
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
