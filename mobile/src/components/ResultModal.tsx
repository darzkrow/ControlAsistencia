import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { THEME } from '../config/constants';
import { MarcacionMovilResponse } from '../types';

interface ResultModalProps {
  visible: boolean;
  result: MarcacionMovilResponse | null;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ visible, result, onClose }) => {
  if (!result) return null;

  const isFuera = result.fuera_de_sede;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isFuera ? styles.cardAlert : styles.cardSuccess]}>
          {/* Encabezado del Modal */}
          <View style={styles.header}>
            <View style={[styles.statusIconBadge, isFuera ? styles.badgeDanger : styles.badgeSuccess]}>
              <Text style={[styles.statusIconText, isFuera ? styles.textDanger : styles.textSuccess]}>
                {isFuera ? 'ALERTA DE AUDITORIA' : 'MARCACION EXITOSA'}
              </Text>
            </View>
            <Text style={styles.timestamp12h}>{result.hora_12h}</Text>
          </View>

          {/* Datos del Colaborador */}
          <View style={styles.body}>
            <Text style={styles.employeeName}>{result.nombre_completo}</Text>
            <Text style={styles.employeeRole}>
              Cedula: {result.cedula} | {result.departamento}
            </Text>

            <View style={styles.divider} />

            {/* Detalles de la Marcacion */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>TIPO DE EVENTO</Text>
              <Text style={styles.detailValue}>{result.tipo_evento}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>METODO DE AUTENTICACION</Text>
              <Text style={styles.detailValue}>{result.metodo_auth}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SEDE ASIGNADA</Text>
              <Text style={styles.detailValue}>{result.sede_nombre}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>DISTANCIA A LA SEDE</Text>
              <Text style={[styles.detailValue, isFuera ? styles.textDanger : styles.textSuccess]}>
                {result.distancia_metros} metros (tolerancia: {result.radio_tolerancia_metros}m)
              </Text>
            </View>

            {/* Alerta de Auditoria RRHH cuando es fuera de sede */}
            {isFuera ? (
              <View style={styles.alertBox}>
                <Text style={styles.alertTitle}>REGISTRO FUERA DE SEDE REGISTRADO</Text>
                <Text style={styles.alertDescription}>
                  La marcacion fue registrada exitosamente, pero queda marcada con bandera de ALERTA para que el departamento de Recursos Humanos verifique si el personal se encontraba en comision de servicio o si se trata de un intento de marcacion fraudulenta.
                </Text>
              </View>
            ) : (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>VERIFICACION DE PRESENCIA CONFIRMADA</Text>
                <Text style={styles.successDescription}>
                  Ubicacion GPS validada dentro del perimetro de la sede autorizada.
                </Text>
              </View>
            )}
          </View>

          {/* Boton de Cierre */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeButtonText}>ENTENDIDO / FINALIZAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  cardAlert: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
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
  statusIconText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textSuccess: {
    color: THEME.colors.success,
  },
  textDanger: {
    color: THEME.colors.danger,
  },
  timestamp12h: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  body: {
    marginBottom: 20,
  },
  employeeName: {
    color: THEME.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  employeeRole: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  detailValue: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  alertBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  alertTitle: {
    color: THEME.colors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  alertDescription: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  successTitle: {
    color: THEME.colors.success,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  successDescription: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  closeButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#070b14',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
