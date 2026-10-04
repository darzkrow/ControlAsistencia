import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { THEME } from '../config/constants';
import { autenticarConSensorDactilar } from '../services/biometricService';

interface FingerprintScannerPadProps {
  onFingerprintCaptured: (template: string) => void;
  isScanning: boolean;
}

export const FingerprintScannerPad: React.FC<FingerprintScannerPadProps> = ({
  onFingerprintCaptured,
  isScanning,
}) => {
  const [statusText, setStatusText] = useState<string>('Coloque el dedo en el lector biometrico');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handlePressScan = async () => {
    if (isScanning) return;
    setStatusText('Activando sensor biometrico...');
    setIsSuccess(false);

    try {
      const res = await autenticarConSensorDactilar('Verifique su huella dactilar para asistencia');
      if (res.success && res.token) {
        setIsSuccess(true);
        setStatusText('Huella digital validada y plantilla generada');
        onFingerprintCaptured(res.token);
      } else {
        setStatusText(res.error || 'Lectura no completada. Intente nuevamente.');
      }
    } catch {
      setStatusText('Error al comunicarse con el sensor');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MODULO 1: SENSOR BIOMETRICO DACTILAR</Text>
      <Text style={styles.subtitle}>
        Lector de huellas capacitivo / optico de alta resolucion
      </Text>

      <TouchableOpacity
        style={[
          styles.pad,
          isScanning ? styles.padScanning : null,
          isSuccess ? styles.padSuccess : null,
        ]}
        onPress={handlePressScan}
        activeOpacity={0.8}
        disabled={isScanning}
      >
        <View style={styles.outerRing}>
          <View style={styles.middleRing}>
            <View style={styles.innerCore}>
              {isScanning ? (
                <ActivityIndicator size="large" color={THEME.colors.primary} />
              ) : (
                <View style={styles.fingerprintGraphic}>
                  <View style={styles.ridgeLine1} />
                  <View style={styles.ridgeLine2} />
                  <View style={styles.ridgeLine3} />
                  <View style={styles.ridgeLine4} />
                  <View style={styles.ridgeLine5} />
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={[styles.instruction, isSuccess ? styles.instructionSuccess : null]}>
          {statusText}
        </Text>

        <View style={styles.actionPill}>
          <Text style={styles.actionPillText}>
            {isScanning ? 'PROCESANDO MINUCIAS...' : 'TOCAR PARA CAPTURAR HUELLA'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtitle: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginBottom: 14,
  },
  pad: {
    backgroundColor: 'rgba(11, 15, 25, 0.8)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padScanning: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  padSuccess: {
    borderColor: THEME.colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(14, 165, 233, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  middleRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCore: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintGraphic: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  ridgeLine1: {
    width: 20,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
  ridgeLine2: {
    width: 32,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
  ridgeLine3: {
    width: 40,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
  ridgeLine4: {
    width: 36,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
  ridgeLine5: {
    width: 24,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
  instruction: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionSuccess: {
    color: THEME.colors.success,
  },
  actionPill: {
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionPillText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
