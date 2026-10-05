import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../config/constants';
import { UbicacionGPS } from '../types';

interface HeaderBarProps {
  serverConnected: boolean;
  gpsCoords: UbicacionGPS | null;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  serverConnected,
  gpsCoords,
  onOpenSettings,
  onOpenHistory,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('es-VE', {
          timeZone: 'America/Caracas',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now);
        setTimeStr(formatted);
      } catch {
        setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: true }));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.brandTitle}>RAPTURE BIOMETRICS</Text>
        <Text style={styles.brandSubtitle}>TERMINAL MOVIL Y TABLET GPS</Text>
      </View>

      <View style={styles.centerSection}>
        <View style={styles.clockContainer}>
          <Text style={styles.clockText}>{timeStr || '--:--:-- --'}</Text>
          <Text style={styles.timezoneBadge}>America/Caracas (12h)</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Indicador de Conexion al Servidor */}
        <View style={[styles.statusPill, serverConnected ? styles.pillSuccess : styles.pillDanger]}>
          <View style={[styles.statusDot, serverConnected ? styles.dotSuccess : styles.dotDanger]} />
          <Text style={styles.statusText}>{serverConnected ? 'EN LINEA' : 'OFFLINE'}</Text>
        </View>

        {/* Indicador de Precision GPS */}
        <View style={styles.gpsPill}>
          <Text style={styles.gpsLabel}>GPS</Text>
          <Text style={styles.gpsValue}>
            {gpsCoords ? `+/- ${Math.round(gpsCoords.precision)}m` : 'Buscando...'}
          </Text>
        </View>

        {/* Boton Historial */}
        <TouchableOpacity style={styles.iconButton} onPress={onOpenHistory} activeOpacity={0.7}>
          <Text style={styles.iconButtonText}>HISTORIAL</Text>
        </TouchableOpacity>

        {/* Boton Ajustes */}
        <TouchableOpacity style={styles.iconButton} onPress={onOpenSettings} activeOpacity={0.7}>
          <Text style={styles.iconButtonText}>AJUSTES</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 70,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
  },
  brandTitle: {
    color: THEME.colors.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  clockContainer: {
    alignItems: 'center',
  },
  clockText: {
    color: THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  timezoneBadge: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  rightSection: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  pillSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pillDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSuccess: {
    backgroundColor: THEME.colors.success,
  },
  dotDanger: {
    backgroundColor: THEME.colors.danger,
  },
  statusText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  gpsLabel: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  gpsValue: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  iconButton: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  iconButtonText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
