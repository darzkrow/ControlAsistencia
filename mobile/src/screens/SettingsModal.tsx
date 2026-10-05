import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { THEME, APP_CONFIG } from '../config/constants';
import { SedeGeocerca } from '../types';
import { checkServerHealth, setApiUrl, getApiUrl } from '../services/api';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  sedes: SedeGeocerca[];
  selectedSedeId?: number;
  onSelectSede: (id: number) => void;
  onSimulateGpsCoords?: (lat: number, lon: number) => void;
  onSaveServerUrl?: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  sedes,
  selectedSedeId,
  onSelectSede,
  onSimulateGpsCoords,
  onSaveServerUrl,
}) => {
  const [apiUrlInput, setApiUrlInput] = useState<string>(getApiUrl());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setApiUrlInput(getApiUrl());
      setTestResult(null);
    }
  }, [visible]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const cleanUrl = apiUrlInput.trim().replace(/\/+$/, '');
      const ok = await checkServerHealth(cleanUrl);
      if (ok) {
        setApiUrl(cleanUrl);
        if (onSaveServerUrl) onSaveServerUrl(cleanUrl);
        setTestResult({ ok: true, msg: 'Conexion exitosa con el servidor Rapture Backend' });
      } else {
        setTestResult({
          ok: false,
          msg: 'No se pudo contactar el servidor. Verifique que el backend este activo en ' + cleanUrl + '/health',
        });
      }
    } catch {
      setTestResult({ ok: false, msg: 'Error de red o timeout al intentar contactar la IP.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndApply = async () => {
    const cleanUrl = apiUrlInput.trim().replace(/\/+$/, '');
    setApiUrl(cleanUrl);
    if (onSaveServerUrl) onSaveServerUrl(cleanUrl);
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await checkServerHealth(cleanUrl);
      if (ok) {
        setTestResult({ ok: true, msg: 'Direccion guardada y verificada exitosamente.' });
        setTimeout(() => onClose(), 800);
      } else {
        setTestResult({
          ok: false,
          msg: 'Direccion guardada, pero el servidor no responde al healthcheck. Verifique conexion WiFi/LAN.',
        });
      }
    } catch {
      setTestResult({ ok: false, msg: 'Direccion guardada con advertencia de red.' });
    } finally {
      setIsTesting(false);
    }
  };

  const applyPreset = (presetUrl: string) => {
    setApiUrlInput(presetUrl);
    setTestResult(null);
  };

  const handleSelectSimulatedLocation = (type: 'inside' | 'outside') => {
    if (!onSimulateGpsCoords) return;
    if (type === 'inside') {
      // Coordenadas a 8m de Sede Central
      onSimulateGpsCoords(10.49105, -66.87805);
    } else {
      // Coordenadas a ~4.8km de Sede Central
      onSimulateGpsCoords(10.515, -66.915);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>CONFIGURACION DE TERMINAL MOVIL</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn}>
              <Text style={styles.closeHeaderBtnText}>CERRAR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* Seccion Servidor */}
            <Text style={styles.sectionHeader}>SERVIDOR BACKEND Y RED</Text>
            <Text style={styles.fieldDesc}>
              Especifique la IP y puerto del equipo donde corre el backend. Ambos dispositivos deben estar en la misma red WiFi o LAN.
            </Text>

            <Text style={styles.fieldLabel}>ACCESOS RAPIDOS DE RED</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('http://192.168.30.104:3000/api/v1')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>Host LAN (192.168.30.104:3000)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('http://10.0.2.2:3000/api/v1')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>Emulador (10.0.2.2:3000)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('http://127.0.0.1:3000/api/v1')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetChipText}>Local (127.0.0.1:3000)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>URL BASE DEL API</Text>
            <TextInput
              style={styles.textInput}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              placeholder="http://192.168.30.104:3000/api/v1"
              placeholderTextColor={THEME.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.testBtn]}
                onPress={handleTestConnection}
                disabled={isTesting}
                activeOpacity={0.7}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                ) : (
                  <Text style={styles.testBtnText}>PROBAR CONEXION</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={handleSaveAndApply}
                disabled={isTesting}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>GUARDAR Y APLICAR</Text>
              </TouchableOpacity>
            </View>

            {testResult && (
              <View
                style={[
                  styles.resultBox,
                  testResult.ok ? styles.resultBoxOk : styles.resultBoxErr,
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    testResult.ok ? styles.textSuccess : styles.textDanger,
                  ]}
                >
                  {testResult.msg}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Seccion Seleccion de Sede */}
            <Text style={styles.sectionHeader}>SEDE ASIGNADA PARA GEOVALLA</Text>
            <Text style={styles.fieldDesc}>
              Seleccione la sede principal que servira como referencia para el calculo del radio perimetral GPS.
            </Text>

            {sedes.map((s) => {
              const isSelected = s.id === selectedSedeId;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sedeOption, isSelected ? styles.sedeOptionActive : null]}
                  onPress={() => onSelectSede(s.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sedeOptionTextCol}>
                    <Text style={styles.sedeOptionName}>{s.nombre}</Text>
                    <Text style={styles.sedeOptionDetails}>
                      Ciudad: {s.ciudad} | Radio permitido: {s.radio_tolerancia_metros}m
                    </Text>
                    <Text style={styles.sedeOptionCoords}>
                      GPS: {Number(s.latitud).toFixed(5)}, {Number(s.longitud).toFixed(5)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected ? styles.radioCircleActive : null,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            {/* Simulacion GPS de Pruebas */}
            <Text style={styles.sectionHeader}>SIMULACION GPS PARA CONTROL DE CALIDAD</Text>
            <Text style={styles.fieldDesc}>
              Permite forzar coordenadas de prueba para validar el comportamiento del perimetro y las alertas a RRHH.
            </Text>

            <View style={styles.simButtonsRow}>
              <TouchableOpacity
                style={[styles.simButton, styles.simButtonInside]}
                onPress={() => handleSelectSimulatedLocation('inside')}
              >
                <Text style={styles.simButtonTextSuccess}>SIMULAR DENTRO DE SEDE (8m)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simButton, styles.simButtonOutside]}
                onPress={() => handleSelectSimulatedLocation('outside')}
              >
                <Text style={styles.simButtonTextDanger}>SIMULAR FUERA DE SEDE (4.8km)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxWidth: 600,
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
  closeHeaderBtn: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeHeaderBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  sectionHeader: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldLabel: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  fieldDesc: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  presetChipText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.4)',
  },
  testBtnText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  saveBtnText: {
    color: '#070b14',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  resultBoxOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultBoxErr: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textSuccess: {
    color: THEME.colors.success,
  },
  textDanger: {
    color: THEME.colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 16,
  },
  sedeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 15, 25, 0.6)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sedeOptionActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  sedeOptionTextCol: {
    flex: 1,
  },
  sedeOptionName: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  sedeOptionDetails: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  sedeOptionCoords: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: THEME.colors.textMuted,
    marginLeft: 12,
  },
  radioCircleActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary,
  },
  simButtonsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  simButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  simButtonInside: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  simButtonOutside: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  simButtonTextSuccess: {
    color: THEME.colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  simButtonTextDanger: {
    color: THEME.colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
});
