export const APP_CONFIG = {
  APP_NAME: 'Rapture Biometrics Mobile',
  VERSION: '1.0.0',
  DEFAULT_API_URL: 'http://192.168.30.104:3000/api/v1',
  FALLBACK_LAN_URL: 'http://192.168.30.104:3000/api/v1',
  DEFAULT_TIMEZONE: 'America/Caracas',
  TIME_FORMAT: '12h',
  GPS_HIGH_ACCURACY_THRESHOLD_METERS: 25,
  MAX_OFFLINE_QUEUE_ITEMS: 200,
  DEFAULT_SEDE_FALLBACK: {
    id: 1,
    codigo: 'SEDE-CENTRAL',
    nombre: 'Sede Central Administrativa',
    direccion: 'Av. Libertador, Edif. Rapture Towers',
    ciudad: 'Caracas',
    latitud: 10.4910000,
    longitud: -66.8780000,
    radio_tolerancia_metros: 150,
  }
};

export const THEME = {
  colors: {
    background: '#070b14',
    card: '#0e1626',
    cardBorder: '#1c283e',
    primary: '#0ea5e9', // cyan-500
    primaryGlow: 'rgba(14, 165, 233, 0.25)',
    success: '#10b981', // emerald-500
    successGlow: 'rgba(16, 185, 129, 0.25)',
    warning: '#f59e0b', // amber-500
    warningGlow: 'rgba(245, 158, 11, 0.25)',
    danger: '#ef4444', // red-500
    dangerGlow: 'rgba(239, 68, 68, 0.25)',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#1e293b',
  },
};
