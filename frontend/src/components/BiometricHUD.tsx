import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, Fingerprint, Scan, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export type BiometricMode = 'facial' | 'huella' | 'dual';

export interface BiometricHUDHandle {
  captureSnapshot: () => string | null;
  getFingerprintTemplate: () => string;
}

interface BiometricHUDProps {
  mode: BiometricMode;
  onModeChange: (newMode: BiometricMode) => void;
  isScanning: boolean;
  onFingerprintTouch?: () => void;
}

export const BiometricHUD = forwardRef<BiometricHUDHandle, BiometricHUDProps>(
  ({ mode, onModeChange, isScanning, onFingerprintTouch }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [cameraActive, setCameraActive] = useState<boolean>(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [fingerprintProgress, setFingerprintProgress] = useState<number>(0);

    // Initialize Camera Stream
    const startCamera = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Navegador no soporta acceso a cámara WebRTC');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      } catch (err) {
        console.error('Error al inicializar cámara:', err);
        setCameraError(
          err instanceof Error
            ? err.message
            : 'No se pudo acceder a la cámara. Verifique permisos del navegador.'
        );
        setCameraActive(false);
      }
    };

    useEffect(() => {
      if (mode === 'facial' || mode === 'dual') {
        startCamera();
      } else {
        // Stop camera tracks if in purely fingerprint mode to save resources
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
          setCameraActive(false);
        }
      }

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, [mode]);

    // Fingerprint touch simulation animation
    useEffect(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      if (isScanning && (mode === 'huella' || mode === 'dual')) {
        setFingerprintProgress(0);
        let p = 0;
        interval = setInterval(() => {
          p += 10;
          if (p <= 100) {
            setFingerprintProgress(p);
          } else {
            clearInterval(interval!);
          }
        }, 80);
      } else {
        setFingerprintProgress(0);
      }

      return () => {
        if (interval) clearInterval(interval);
      };
    }, [isScanning, mode]);

    // Expose snapshot and template methods
    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return null;

        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.88);
      },
      getFingerprintTemplate: () => {
        // Generate simulated ISO/IEC 19794-2 biometric hash template
        const randId = Math.random().toString(36).substring(2, 15);
        return `ISO_FINGERPRINT_TEMPLATE_${randId.toUpperCase()}`;
      },
    }));

    return (
      <div className="glass-panel" style={{ padding: '24px', width: '100%', maxWidth: '520px' }}>
        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(8, 12, 22, 0.7)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => onModeChange('facial')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: mode === 'facial' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: mode === 'facial' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: mode === 'facial' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
            }}
          >
            <Camera size={16} />
            <span>Facial</span>
          </button>

          <button
            onClick={() => onModeChange('huella')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: mode === 'huella' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: mode === 'huella' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: mode === 'huella' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
            }}
          >
            <Fingerprint size={16} />
            <span>Huella Dactilar</span>
          </button>

          <button
            onClick={() => onModeChange('dual')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: mode === 'dual' ? 'rgba(0, 245, 160, 0.15)' : 'transparent',
              color: mode === 'dual' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              border: mode === 'dual' ? '1px solid rgba(0, 245, 160, 0.3)' : '1px solid transparent',
            }}
          >
            <ShieldCheck size={16} />
            <span>Dual Pro</span>
          </button>
        </div>

        {/* Viewport Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '340px',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#04060a',
            border: isScanning
              ? '2px solid var(--accent-cyan)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: isScanning ? 'var(--shadow-neon)' : 'inset 0 0 40px rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Laser Sweep Line */}
          {isScanning && <div className="laser-bar" />}

          {/* FACIAL / CAMERA VIEW */}
          {(mode === 'facial' || mode === 'dual') && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: cameraActive ? 'block' : 'none',
                  filter: isScanning ? 'contrast(1.05) saturate(1.1)' : 'none',
                }}
              />

              {!cameraActive && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  {cameraError ? (
                    <>
                      <AlertCircle size={36} color="var(--accent-coral)" />
                      <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem' }}>{cameraError}</p>
                      <button
                        onClick={startCamera}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          fontSize: '0.8rem',
                        }}
                      >
                        <RefreshCw size={14} /> Reintentar
                      </button>
                    </>
                  ) : (
                    <>
                      <Scan size={44} color="var(--accent-cyan)" style={{ animation: 'pulseGlow 2s infinite' }} />
                      <p style={{ fontSize: '0.88rem' }}>Iniciando sensor óptico facial...</p>
                    </>
                  )}
                </div>
              )}

              {/* Target HUD Brackets & Oval */}
              {cameraActive && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {/* Corner Targets */}
                  <div style={{ position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTop: '2px solid var(--accent-cyan)', borderLeft: '2px solid var(--accent-cyan)' }} />
                  <div style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTop: '2px solid var(--accent-cyan)', borderRight: '2px solid var(--accent-cyan)' }} />
                  <div style={{ position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottom: '2px solid var(--accent-cyan)', borderLeft: '2px solid var(--accent-cyan)' }} />
                  <div style={{ position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottom: '2px solid var(--accent-cyan)', borderRight: '2px solid var(--accent-cyan)' }} />

                  {/* Face Guide Oval */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12%',
                      left: '22%',
                      width: '56%',
                      height: '76%',
                      borderRadius: '50%',
                      border: isScanning
                        ? '2px solid var(--accent-cyan)'
                        : '2px dashed rgba(0, 242, 254, 0.45)',
                      boxShadow: isScanning ? '0 0 20px rgba(0,242,254,0.4)' : 'none',
                    }}
                  />

                  {/* Top status indicator badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(8, 12, 22, 0.75)',
                      backdropFilter: 'blur(8px)',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      border: '1px solid rgba(0, 242, 254, 0.3)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />
                    {isScanning ? 'PROCESANDO ESCANEO...' : 'ALINEE ROSTRO EN EL VISOR'}
                  </div>
                </div>
              )}
            </>
          )}

          {/* FINGERPRINT VIEW */}
          {mode === 'huella' && (
            <div
              onClick={onFingerprintTouch}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                background: 'radial-gradient(circle at center, rgba(0, 242, 254, 0.1) 0%, transparent 70%)',
              }}
            >
              {/* Sensor Pad Ring */}
              <div
                style={{
                  position: 'relative',
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  background: isScanning
                    ? 'radial-gradient(circle, rgba(0,245,160,0.2) 0%, rgba(8,12,22,0.9) 100%)'
                    : 'radial-gradient(circle, rgba(0,242,254,0.15) 0%, rgba(8,12,22,0.9) 100%)',
                  border: isScanning
                    ? '2px solid var(--accent-emerald)'
                    : '2px solid rgba(0, 242, 254, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isScanning ? 'var(--shadow-neon-emerald)' : 'var(--shadow-neon)',
                  transition: 'all 0.3s ease',
                }}
              >
                <Fingerprint
                  size={84}
                  color={isScanning ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}
                  style={{
                    filter: isScanning ? 'drop-shadow(0 0 10px #00f5a0)' : 'drop-shadow(0 0 8px #00f2fe)',
                    transition: 'all 0.3s ease',
                  }}
                />

                {/* Rotating scanner radar border */}
                {isScanning && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: '50%',
                      border: '2px dashed var(--accent-emerald)',
                      animation: 'radarSpin 4s linear infinite',
                    }}
                  />
                )}
              </div>

              {/* Status Message */}
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: isScanning ? 'var(--accent-emerald)' : '#fff' }}>
                  {isScanning ? `LEYENDO MINUCIAS... ${fingerprintProgress}%` : 'COLOQUE HUELLA EN EL SENSOR'}
                </p>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Sensor óptico USB o toque la pantalla para capturar
                </small>
              </div>
            </div>
          )}

          {/* DUAL MODE MINI OVERLAY */}
          {mode === 'dual' && (
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                right: 14,
                width: '74px',
                height: '74px',
                borderRadius: '16px',
                background: 'rgba(8, 12, 22, 0.85)',
                backdropFilter: 'blur(10px)',
                border: isScanning ? '2px solid var(--accent-emerald)' : '1px solid rgba(0, 242, 254, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                zIndex: 20,
              }}
            >
              <Fingerprint
                size={40}
                color={isScanning ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,242,254,0.5))' }}
              />
            </div>
          )}
        </div>

        {/* Hidden Canvas for High-Res Snapshot Extraction */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }
);
