import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { THEME, APP_CONFIG } from '../config/constants';
import {
  SedeGeocerca,
  UbicacionGPS,
  GeofenceStatus,
  TipoEventoAsistencia,
  MarcacionMovilResponse,
} from '../types';
import {
  obtenerPosicionActual,
  evaluarGeovalla,
} from '../services/locationService';
import {
  checkServerHealth,
  fetchSedesGeocercas,
  registrarAsistenciaMovil,
  sincronizarColaOffline,
} from '../services/api';
import { encolarMarcacionOffline, obtenerHistorialLocal } from '../services/storageService';
import { HeaderBar } from '../components/HeaderBar';
import { GeofenceRadar } from '../components/GeofenceRadar';
import { FingerprintScannerPad } from '../components/FingerprintScannerPad';
import { CameraFaceCapture } from '../components/CameraFaceCapture';
import { ResultModal } from '../components/ResultModal';
import { SettingsModal } from './SettingsModal';
import { AuditHistoryModal } from './AuditHistoryModal';

export const MainKioskScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Estados principales
  const [cedulaInput, setCedulaInput] = useState<string>('');
  const [tipoEvento, setTipoEvento] = useState<TipoEventoAsistencia>('ENTRADA');
  const [fingerprintToken, setFingerprintToken] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  // Estados de red y geolocalizacion
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [sedes, setSedes] = useState<SedeGeocerca[]>([APP_CONFIG.DEFAULT_SEDE_FALLBACK]);
  const [selectedSedeId, setSelectedSedeId] = useState<number>(1);
  const [gpsCoords, setGpsCoords] = useState<UbicacionGPS | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modales
  const [scanResult, setScanResult] = useState<MarcacionMovilResponse | null>(null);
  const [isResultOpen, setIsResultOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializacion: Carga de sedes, GPS y monitoreo de salud del servidor
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // 1. Salud del backend
      const online = await checkServerHealth();
      if (isMounted) setServerConnected(online);

      // 2. Obtener lista de sedes con geocercas
      const sedesList = await fetchSedesGeocercas();
      if (isMounted && sedesList.length > 0) {
        setSedes(sedesList);
        setSelectedSedeId(sedesList[0].id);
      }

      // 3. Obtener posicion GPS inicial
      const pos = await obtenerPosicionActual();
      if (isMounted) setGpsCoords(pos);

      // 4. Intentar sincronizar cola offline si estamos conectados
      if (online) {
        await sincronizarColaOffline();
      }
    };

    init();

    // Actualizacion periodica de GPS y salud del servidor cada 10s
    const interval = setInterval(async () => {
      const online = await checkServerHealth();
      if (isMounted) setServerConnected(online);

      const pos = await obtenerPosicionActual();
      if (isMounted) setGpsCoords(pos);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Evaluacion en tiempo real del estado de la Geovalla
  const geofenceStatus: GeofenceStatus = evaluarGeovalla(
    gpsCoords,
    sedes,
    selectedSedeId
  );
  const activeSede = sedes.find((s) => s.id === selectedSedeId) || sedes[0];

  // Envio de Marcacion Biometrica
  const handleSubmitAttendance = async () => {
    setErrorMessage(null);
    const idNum = Number(cedulaInput.replace(/\D/g, ''));
    if (!idNum || isNaN(idNum)) {
      setErrorMessage('Por favor ingrese un numero de cedula valido.');
      return;
    }

    if (!fingerprintToken && !photoBase64) {
      setErrorMessage('Debe capturar al menos la huella dactilar o la fotografia facial.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      cedula: idNum,
      tipo_evento: tipoEvento,
      metodo_auth:
        fingerprintToken && photoBase64
          ? ('HUELLA_FACIAL' as const)
          : fingerprintToken
          ? ('HUELLA' as const)
          : ('FACIAL' as const),
      latitud: gpsCoords ? gpsCoords.latitud : APP_CONFIG.DEFAULT_SEDE_FALLBACK.latitud,
      longitud: gpsCoords ? gpsCoords.longitud : APP_CONFIG.DEFAULT_SEDE_FALLBACK.longitud,
      precision_gps: gpsCoords ? gpsCoords.precision : 10,
      sede_id: selectedSedeId,
      foto_base64: photoBase64,
      template_huella: fingerprintToken,
      dispositivo_info: isTablet ? 'Tablet Android Corporativa' : 'Movil Supervisor Android',
    };

    try {
      const response = await registrarAsistenciaMovil(payload);
      setScanResult(response);
      setIsResultOpen(true);

      // Limpiar formulario tras registro
      setCedulaInput('');
      setFingerprintToken(null);
      setPhotoBase64(null);
    } catch {
      // Manejo de contingencia offline: Encolar localmente
      encolarMarcacionOffline(payload);
      setErrorMessage('Conexion no disponible. Marcacion guardada en cola local offline y se sincronizara automaticamente al reconectar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        serverConnected={serverConnected}
        gpsCoords={gpsCoords}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Radar de Geovalla y Proximidad GPS */}
        <GeofenceRadar
          status={geofenceStatus}
          coords={gpsCoords}
          sede={activeSede}
        />

        {/* Mensaje de Error */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Layout Responsive: Columnas en Tablet, Fila en Smartphone */}
        <View style={isTablet ? styles.tabletRow : styles.mobileCol}>
          {/* Columna Izquierda / Panel de Identificacion */}
          <View style={isTablet ? styles.tabletLeftCol : styles.mobileSection}>
            <View style={styles.cardInput}>
              <Text style={styles.cardTitle}>IDENTIFICACION DEL COLABORADOR</Text>
              <Text style={styles.cardSubtitle}>
                Ingrese el numero de documento nacional de identidad
              </Text>

              <TextInput
                style={styles.cedulaInput}
                value={cedulaInput}
                onChangeText={setCedulaInput}
                placeholder="Ej. 22789456"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />

              {/* Selector de Tipo de Evento */}
              <View style={styles.tipoEventoRow}>
                <TouchableOpacity
                  style={[
                    styles.tipoEventoBtn,
                    tipoEvento === 'ENTRADA' ? styles.tipoEventoActiveEntrada : null,
                  ]}
                  onPress={() => setTipoEvento('ENTRADA')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tipoEventoText,
                      tipoEvento === 'ENTRADA' ? styles.textSuccess : null,
                    ]}
                  >
                    ENTRADA JORNADA
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tipoEventoBtn,
                    tipoEvento === 'SALIDA' ? styles.tipoEventoActiveSalida : null,
                  ]}
                  onPress={() => setTipoEvento('SALIDA')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tipoEventoText,
                      tipoEvento === 'SALIDA' ? styles.textDanger : null,
                    ]}
                  >
                    SALIDA JORNADA
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Resumen de Capturas Biometricas Realizadas */}
              <View style={styles.biometricStatusBox}>
                <View style={styles.bioStatusItem}>
                  <View
                    style={[
                      styles.statusDot,
                      fingerprintToken ? styles.dotSuccess : styles.dotPending,
                    ]}
                  />
                  <Text style={styles.bioStatusLabel}>
                    HUELLA: {fingerprintToken ? 'CAPTURADA' : 'PENDIENTE'}
                  </Text>
                </View>

                <View style={styles.bioStatusItem}>
                  <View
                    style={[
                      styles.statusDot,
                      photoBase64 ? styles.dotSuccess : styles.dotPending,
                    ]}
                  />
                  <Text style={styles.bioStatusLabel}>
                    FOTO: {photoBase64 ? 'CAPTURADA' : 'PENDIENTE'}
                  </Text>
                </View>
              </View>

              {/* Boton Principal de Registro */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting ? styles.submitButtonDisabled : null,
                  geofenceStatus.enSede ? styles.submitButtonSuccess : styles.submitButtonWarning,
                ]}
                onPress={handleSubmitAttendance}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#070b14" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {geofenceStatus.enSede
                      ? 'REGISTRAR ASISTENCIA EN SEDE'
                      : 'REGISTRAR MARCACION (ALERTA FUERA DE SEDE)'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Columna Derecha / Modulos Biometricos */}
          <View style={isTablet ? styles.tabletRightCol : styles.mobileSection}>
            {/* Lector de Huella */}
            <FingerprintScannerPad
              onFingerprintCaptured={(token) => setFingerprintToken(token)}
              isScanning={isSubmitting}
            />

            {/* Captura de Foto Facial */}
            <CameraFaceCapture
              photoUri={photoBase64}
              onPhotoCaptured={(base64) => setPhotoBase64(base64)}
              onClearPhoto={() => setPhotoBase64(null)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modal de Confirmacion de Marcacion */}
      <ResultModal
        visible={isResultOpen}
        result={scanResult}
        onClose={() => setIsResultOpen(false)}
      />

      {/* Modal de Configuraciones */}
      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sedes={sedes}
        selectedSedeId={selectedSedeId}
        onSelectSede={(id) => setSelectedSedeId(id)}
        onSimulateGpsCoords={(lat, lon) => {
          setGpsCoords({
            latitud: lat,
            longitud: lon,
            precision: 5,
            timestamp: Date.now(),
          });
        }}
      />

      {/* Modal de Historial Local */}
      <AuditHistoryModal
        visible={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={obtenerHistorialLocal()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  tabletRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  mobileCol: {
    flexDirection: 'column',
    gap: 16,
  },
  tabletLeftCol: {
    flex: 1,
  },
  tabletRightCol: {
    flex: 1.2,
  },
  mobileSection: {
    width: '100%',
  },
  cardInput: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginBottom: 14,
    marginTop: 2,
  },
  cedulaInput: {
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 14,
  },
  tipoEventoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tipoEventoBtn: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.6)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoEventoActiveEntrada: {
    borderColor: THEME.colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  tipoEventoActiveSalida: {
    borderColor: THEME.colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  tipoEventoText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textSuccess: {
    color: THEME.colors.success,
  },
  textDanger: {
    color: THEME.colors.danger,
  },
  biometricStatusBox: {
    backgroundColor: 'rgba(11, 15, 25, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  bioStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSuccess: {
    backgroundColor: THEME.colors.success,
  },
  dotPending: {
    backgroundColor: THEME.colors.textMuted,
  },
  bioStatusLabel: {
    color: THEME.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonSuccess: {
    backgroundColor: THEME.colors.success,
  },
  submitButtonWarning: {
    backgroundColor: THEME.colors.warning,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#070b14',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
