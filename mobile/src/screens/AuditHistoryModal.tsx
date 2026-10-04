import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { THEME } from '../config/constants';
import { RegistroHistorialLocal } from '../types';

interface AuditHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  history: RegistroHistorialLocal[];
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  visible,
  onClose,
  history,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>REGISTRO LOCAL DE AUDITORIA Y ASISTENCIAS</Text>
              <Text style={styles.subtitle}>Marcaciones registradas en este dispositivo</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>CERRAR</Text>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay marcaciones registradas en esta sesion.</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.historyItem,
                    item.fuera_de_sede ? styles.itemFuera : styles.itemEnSede,
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.nombre_completo}</Text>
                    <Text style={styles.itemTime}>{item.hora_12h}</Text>
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemMeta}>
                      Cedula: {item.cedula} | {item.tipo_evento} ({item.metodo_auth})
                    </Text>
                    <Text style={styles.itemSede}>{item.sede_nombre}</Text>
                  </View>

                  <View style={styles.itemFooter}>
                    <View
                      style={[
                        styles.badge,
                        item.fuera_de_sede ? styles.badgeDanger : styles.badgeSuccess,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          item.fuera_de_sede ? styles.textDanger : styles.textSuccess,
                        ]}
                      >
                        {item.fuera_de_sede
                          ? `ALERTA RRHH: FUERA DE SEDE (${item.distancia_metros}m)`
                          : `EN SEDE (${item.distancia_metros}m)`}
                      </Text>
                    </View>

                    <Text style={styles.syncStatus}>
                      {item.sincronizado ? 'SINCRONIZADO BD' : 'EN COLA LOCAL'}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
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
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  title: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtitle: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  historyItem: {
    backgroundColor: 'rgba(11, 15, 25, 0.7)',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  itemEnSede: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  itemFuera: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  itemTime: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemDetails: {
    marginBottom: 8,
  },
  itemMeta: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  itemSede: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textSuccess: {
    color: THEME.colors.success,
  },
  textDanger: {
    color: THEME.colors.danger,
  },
  syncStatus: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
