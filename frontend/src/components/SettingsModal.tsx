import React, { useState } from 'react';
import { getApiBaseUrl, setApiBaseUrl, checkServerHealth } from '../services/api';
import { biometricAudio } from '../services/audio';
import { Settings, X, Server, Volume2, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshHealth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshHealth,
}) => {
  const [apiUrl, setApiUrlState] = useState<string>(getApiBaseUrl());
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testing, setTesting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    onRefreshHealth();
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('idle');
    setApiBaseUrl(apiUrl);

    const ok = await checkServerHealth();
    setTesting(false);
    setTestResult(ok ? 'success' : 'error');
    if (ok) {
      biometricAudio.playSuccess();
    } else {
      biometricAudio.playError();
    }
    onRefreshHealth();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 6, 12, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '28px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={22} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem' }}>Configuración del Terminal Kiosko</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* API URL Setting */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            URL DEL SERVIDOR BACKEND (AXUM)
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrlState(e.target.value)}
              className="mono"
              placeholder="http://127.0.0.1:3000"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(8, 12, 22, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.88rem',
              }}
            />
            <button
              onClick={handleTestConnection}
              disabled={testing}
              style={{
                padding: '0 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--accent-cyan)',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Server size={14} /> {testing ? 'Probando...' : 'Probar'}
            </button>
          </div>

          {testResult === 'success' && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.78rem',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle size={14} /> Conexión con Axum exitosa.
            </div>
          )}

          {testResult === 'error' && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.78rem',
                color: 'var(--accent-coral)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={14} /> No se pudo conectar al backend en esa URL.
            </div>
          )}
        </div>

        {/* Audio Test */}
        <div style={{ marginBottom: '22px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            FEEDBACK AUDITIVO (WEB AUDIO API)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => biometricAudio.playScanTone()}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--accent-cyan)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Volume2 size={14} /> Tono Escaneo
            </button>
            <button
              onClick={() => biometricAudio.playSuccess()}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 245, 160, 0.1)',
                color: 'var(--accent-emerald)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle size={14} /> Tono Éxito
            </button>
            <button
              onClick={() => biometricAudio.playError()}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 75, 92, 0.1)',
                color: 'var(--accent-coral)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={14} /> Tono Rechazo
            </button>
          </div>
        </div>

        {/* Tauri / Desktop Hardware Integration Notice */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Shield size={16} color="var(--accent-cyan)" />
            <strong style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
              Compatibilidad con Tauri (App de Escritorio)
            </strong>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            Este frontend puede ser empaquetado directamente en una aplicación nativa de Windows con Tauri v2, permitiendo conexión FFI directa a SDKs DLL de lectores de huella dactilar USB (DigitalPersona, SecuGen, ZKTeco).
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
              color: '#070a13',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
