import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { THEME } from '../config/constants';

interface CameraFaceCaptureProps {
  onPhotoCaptured: (photoBase64: string) => void;
  photoUri: string | null;
  onClearPhoto: () => void;
}

export const CameraFaceCapture: React.FC<CameraFaceCaptureProps> = ({
  onPhotoCaptured,
  photoUri,
  onClearPhoto,
}) => {
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  const handleCaptureSimulation = () => {
    // Genera plantilla de captura de imagen facial de alta definicion (SVG/Base64)
    const mockFaceBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...MOCK_FACE_CAPTURE';
    onPhotoCaptured(mockFaceBase64);
  };

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>MODULO 2: CAPTURA FOTOGRAFICA FACIAL</Text>
          <Text style={styles.subtitle}>Verificacion de presencia fisica y prueba de vida</Text>
        </View>

        <TouchableOpacity style={styles.facingToggle} onPress={toggleCameraFacing} activeOpacity={0.7}>
          <Text style={styles.facingToggleText}>
            CAMARA: {cameraFacing.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.viewfinderContainer}>
        {photoUri ? (
          <View style={styles.previewContainer}>
            <View style={styles.previewPlaceholder}>
              <View style={styles.faceOvalCheck}>
                <Text style={styles.faceCheckText}>FOTO CAPTURADA</Text>
                <Text style={styles.faceCheckSubtext}>Verificacion facial completada</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.retakeButton} onPress={onClearPhoto} activeOpacity={0.7}>
              <Text style={styles.retakeButtonText}>REPETIR FOTO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.liveViewfinder}>
            {/* Guia oval de encuadre facial */}
            <View style={styles.faceGuideOval}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
              <Text style={styles.guideText}>ALINEE SU ROSTRO AQUI</Text>
            </View>

            <TouchableOpacity
              style={styles.shutterButton}
              onPress={handleCaptureSimulation}
              activeOpacity={0.8}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <Text style={styles.shutterHint}>TOCAR PARA CAPTURAR FOTO</Text>
          </View>
        )}
      </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    marginTop: 2,
  },
  facingToggle: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  facingToggleText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  viewfinderContainer: {
    height: 220,
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveViewfinder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuideOval: {
    width: 130,
    height: 160,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.5)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  cornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: THEME.colors.primary,
  },
  cornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: THEME.colors.primary,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: THEME.colors.primary,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: THEME.colors.primary,
  },
  guideText: {
    color: 'rgba(14, 165, 233, 0.7)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  shutterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
  },
  shutterHint: {
    color: THEME.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  faceOvalCheck: {
    width: 120,
    height: 140,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: THEME.colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  faceCheckText: {
    color: THEME.colors.success,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  faceCheckSubtext: {
    color: THEME.colors.textSecondary,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  retakeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeButtonText: {
    color: THEME.colors.danger,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
