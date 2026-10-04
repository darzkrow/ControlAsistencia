import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../config/constants';
import { GeofenceStatus, SedeGeocerca, UbicacionGPS } from '../types';

interface GeofenceRadarProps {
  status: GeofenceStatus;
  coords: UbicacionGPS | null;
  sede: SedeGeocerca | null;
}

export const GeofenceRadar: React.FC<GeofenceRadarProps> = ({ status, coords, sede }) => {
  const isEnSede = status.enSede;

  return (
    <View style={[styles.card, isEnSede ? styles.cardInside : styles.cardOutside]}>
      {/* Cabecera de la Geovalla */}
      <View style={styles.headerRow}>
        <View style={styles.sedeInfo}>
          <Text style={styles.sectionLabel}>GEOVALLA Y CONTROL PERIMETRAL GPS</Text>
          <Text style={styles.sedeName}>{sede ? sede.nombre : 'Sede Central'}</Text>
          <Text style={styles.sedeDetails}>
            Tolerancia permitida: {status.radioPermitido} metros | Ciudad: {sede ? sede.ciudad : 'Caracas'}
          </Text>
        </View>

        <View style={[styles.badge, isEnSede ? styles.badgeSuccess : styles.badgeDanger]}>
          <Text style={[styles.badgeText, isEnSede ? styles.badgeTextSuccess : styles.badgeTextDanger]}>
            {isEnSede ? 'DENTRO DE SEDE' : 'FUERA DE SEDE (ALERTA)'}
          </Text>
        </View>
      </View>

      {/* Metricas de Distancia */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>DISTANCIA A LA SEDE</Text>
          <Text style={[styles.metricValue, isEnSede ? styles.textSuccess : styles.textDanger]}>
            {status.distanciaMetros > 1000
              ? `${(status.distanciaMetros / 1000).toFixed(2)} km`
              : `${status.distanciaMetros} m`}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>RADIO MAXIMO PERMITIDO</Text>
          <Text style={styles.metricValueSecondary}>{status.radioPermitido} m</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>COORDENADAS DISPOSITIVO</Text>
          <Text style={styles.metricValueCoords}>
            {coords
              ? `${coords.latitud.toFixed(5)}, ${coords.longitud.toFixed(5)}`
              : 'Obteniendo GPS...'}
          </Text>
        </View>
      </View>

      {/* Banner de Aviso de Auditoria RRHH cuando esta fuera del rango */}
      {!isEnSede && (
        <View style={styles.warningBanner}>
          <View style={styles.warningIndicatorBar} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>AVISO DE SEGURIDAD Y AUDITORIA RRHH</Text>
            <Text style={styles.warningText}>
              Este dispositivo se encuentra fuera del radio de tolerancia establecido ({status.distanciaMetros}m &gt; {status.radioPermitido}m). La marcacion permitira registrar la huella y foto, pero se enviara una alerta automatica a Recursos Humanos para verificar si el personal esta realmente en comision o se trata de una marcacion fraudulenta.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardInside: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  cardOutside: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sedeInfo: {
    flex: 1,
  },
  sectionLabel: {
    color: THEME.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sedeName: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sedeDetails: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextSuccess: {
    color: THEME.colors.success,
  },
  badgeTextDanger: {
    color: THEME.colors.danger,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11, 15, 25, 0.6)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  metricBlock: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: THEME.colors.border,
  },
  metricLabel: {
    color: THEME.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  textSuccess: {
    color: THEME.colors.success,
  },
  textDanger: {
    color: THEME.colors.danger,
  },
  metricValueSecondary: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  metricValueCoords: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  warningIndicatorBar: {
    width: 4,
    backgroundColor: THEME.colors.danger,
  },
  warningContent: {
    flex: 1,
    padding: 10,
  },
  warningTitle: {
    color: THEME.colors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  warningText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});
