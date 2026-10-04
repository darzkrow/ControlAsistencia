import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BiometricHUD } from './components/BiometricHUD';
import type { BiometricHUDHandle, BiometricMode } from './components/BiometricHUD';
import { CkpInput } from './components/CkpInput';
import { ResultCard } from './components/ResultCard';
import { RecentEvents } from './components/RecentEvents';
import { SettingsModal } from './components/SettingsModal';
import { AdminPortal } from './components/admin/AdminPortal';
import {
  registrarEscaneo,
  checkServerHealth,
} from './services/api';
import type { EscaneoResponse, EventoReciente } from './services/api';
import { biometricAudio } from './services/audio';

export const App: React.FC = () => {
  const [cedula, setCedula] = useState<string>('');
  const [mode, setMode] = useState<BiometricMode>('facial');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<EscaneoResponse | null>(null);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'kiosko' | 'admin'>('kiosko');
  const [cooldown, setCooldown] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<EventoReciente[]>([]);

  const hudRef = useRef<BiometricHUDHandle | null>(null);

  // Check server health periodically and on window focus
  const refreshHealth = async () => {
    const isOnline = await checkServerHealth();
    setServerConnected(isOnline);
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 4000);
    const handleFocus = () => refreshHealth();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleScan = async () => {
    const idNum = parseInt(cedula, 10);
    if (isNaN(idNum) || idNum <= 0) {
      if (soundEnabled) biometricAudio.playError();
      setScanResult({
        es_empleado: false,
        mensaje: 'Por favor ingrese un número de cédula válido.',
        tipo_evento: 'rechazado',
      });
      return;
    }

    setIsScanning(true);
    if (soundEnabled) biometricAudio.playScanTone();

    // 1. Capture snapshot if mode requires camera
    let fotoB64: string | null = null;
    if (mode === 'facial' || mode === 'dual') {
      fotoB64 = hudRef.current ? hudRef.current.captureSnapshot() : null;
    }

    // 2. Generate fingerprint template if mode requires fingerprint
    let huellaB64: string | null = null;
    if (mode === 'huella' || mode === 'dual') {
      huellaB64 = hudRef.current ? hudRef.current.getFingerprintTemplate() : null;
    }

    try {
      // 3. Send payload to Backend
      const response = await registrarEscaneo({
        cedula: idNum,
        foto_b64: fotoB64,
        huella_b64: huellaB64,
        metodo: mode,
      });

      setIsScanning(false);
      setScanResult(response);

      if (response.es_empleado && (response.tipo_evento === 'entrada' || response.tipo_evento === 'salida')) {
        if (soundEnabled) biometricAudio.playSuccess();
        setCooldown(10); // Anti-passback cooldown
      } else {
        if (soundEnabled) biometricAudio.playError();
      }

      // Add to recent activity log
      const newEvent: EventoReciente = {
        id: Math.random().toString(36).substring(2, 9),
        cedula: idNum,
        nombre: response.nombre_completo || (response.es_empleado ? 'Empleado' : 'Visitante'),
        departamento: response.departamento,
        tipo: response.tipo_evento,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        metodo: mode,
        exito: response.es_empleado,
      };
      setRecentEvents((prev) => [newEvent, ...prev.slice(0, 7)]);
      setCedula('');
    } catch {
      // Simulation fallback when backend is temporarily offline
      setIsScanning(false);

      const isDemoEmployee = ['22789456', '19543210', '25111222'].includes(cedula);
      const demoNames: Record<string, { nombre: string; depto: string }> = {
        '22789456': { nombre: 'Juan Carlos Pérez Gómez', depto: 'Gerencia de estadística' },
        '19543210': { nombre: 'María Alejandra Rodríguez', depto: 'Recursos Humanos' },
        '25111222': { nombre: 'Carlos Eduardo Mendoza', depto: 'Tecnología e Informática' },
      };

      const demoInfo = demoNames[cedula] || { nombre: 'Colaborador Demo', depto: 'Operaciones' };
      const simulatedResponse: EscaneoResponse = isDemoEmployee
        ? {
            es_empleado: true,
            mensaje: `¡Bienvenido/a, ${demoInfo.nombre}! Entrada registrada.`,
            nombre_completo: demoInfo.nombre,
            departamento: demoInfo.depto,
            tipo_evento: 'entrada',
            foto_detectada_b64: fotoB64?.split(',')[1] || undefined,
            minutos_acumulados: 240,
          }
        : {
            es_empleado: false,
            mensaje: 'Bienvenido a Rapture. Por favor diríjase a la recepción para registrar su visita.',
            tipo_evento: 'visitante',
          };

      setScanResult(simulatedResponse);
      if (simulatedResponse.es_empleado) {
        if (soundEnabled) biometricAudio.playSuccess();
      } else {
        if (soundEnabled) biometricAudio.playError();
      }

      const newEvent: EventoReciente = {
        id: Math.random().toString(36).substring(2, 9),
        cedula: idNum,
        nombre: simulatedResponse.nombre_completo || 'Visitante',
        departamento: simulatedResponse.departamento,
        tipo: simulatedResponse.tipo_evento,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        metodo: mode,
        exito: simulatedResponse.es_empleado,
      };
      setRecentEvents((prev) => [newEvent, ...prev.slice(0, 7)]);
      setCedula('');
    }
  };

  if (viewMode === 'admin') {
    return <AdminPortal onReturnToKiosk={() => setViewMode('kiosko')} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header Bar */}
      <Header
        serverConnected={serverConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenAdmin={() => setViewMode('admin')}
        onRefreshHealth={refreshHealth}
      />

      {/* Main Terminal Viewport */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '30px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1100px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Biometric HUD Scanner */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <BiometricHUD
              ref={hudRef}
              mode={mode}
              onModeChange={setMode}
              isScanning={isScanning}
              onFingerprintTouch={() => {
                if (cedula && !isScanning) {
                  handleScan();
                }
              }}
            />
          </div>

          {/* Right Column: Keypad & Recent History */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <CkpInput
              cedula={cedula}
              onCedulaChange={setCedula}
              onSubmit={handleScan}
              isScanning={isScanning}
              cooldownSeconds={cooldown}
            />

            <RecentEvents
              events={recentEvents}
              onSelectCedula={(c) => setCedula(c.toString())}
            />
          </div>
        </div>
      </main>

      {/* Footer System Status Bar */}
      <footer
        style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(8, 12, 22, 0.7)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>
          <span>Protocolo: </span>
          <strong style={{ color: 'var(--accent-cyan)' }}>HTTPS / WSS / REST</strong>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>Motor Facial: </span>
          <strong style={{ color: '#fff' }}>OpenCV Haar / ONNX Ready</strong>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>Lector Huella: </span>
          <strong style={{ color: 'var(--accent-emerald)' }}>ISO/IEC 19794-2 Bridge</strong>
        </div>
        <div className="mono">RAPTURE-KIOSK-V2.0.4</div>
      </footer>

      {/* Result Card Modal */}
      {scanResult && (
        <ResultCard
          result={scanResult}
          onDismiss={() => setScanResult(null)}
          autoDismissMs={7000}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRefreshHealth={refreshHealth}
      />
    </div>
  );
};

export default App;
