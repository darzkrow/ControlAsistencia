import React, { useState, useEffect } from 'react';
import { Fingerprint, Clock, Server, Volume2, VolumeX, Settings, Shield } from 'lucide-react';

import { formatTimeTo12h, formatDateToLocal, getTimezoneBadge } from '../utils/dateUtils';

interface HeaderProps {
  serverConnected: boolean;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAdmin: () => void;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverConnected,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  onOpenAdmin,
  onRefreshHealth,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(formatTimeTo12h(now, true));
      setDate(formatDateToLocal(now, 'long'));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(8, 12, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(0,242,254,0.2) 0%, rgba(79,172,254,0.05) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)',
          }}
        >
          <Fingerprint size={26} color="var(--accent-cyan)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              RAPTURE <span style={{ color: 'var(--accent-cyan)', fontWeight: 400 }}>BIOMETRICS</span>
            </h1>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                background: 'rgba(0, 242, 254, 0.15)',
                color: 'var(--accent-cyan)',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(0, 242, 254, 0.3)',
              }}
            >
              PRO 2.0
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Terminal de Control de Asistencia y Captador de Huellas
          </p>
        </div>
      </div>

      {/* Center Live Clock */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(14, 21, 38, 0.6)',
          padding: '6px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--accent-cyan)" />
          <span
            className="mono"
            style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' }}
          >
            {time || '00:00:00'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              textTransform: 'capitalize',
              letterSpacing: '0.02em',
            }}
          >
            {date}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'rgba(0, 242, 254, 0.08)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              fontWeight: 600,
            }}
          >
            {getTimezoneBadge()}
          </span>
        </div>
      </div>

      {/* Right Controls and Connection Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Connection status indicator (interactivo) */}
        <button
          type="button"
          onClick={onRefreshHealth}
          title={
            serverConnected
              ? 'Backend Axum en línea (127.0.0.1:3000) • Clic para comprobar estado'
              : 'Backend Axum desconectado • Clic para reintentar conexión'
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '999px',
            background: serverConnected ? 'rgba(0, 245, 160, 0.12)' : 'rgba(255, 75, 92, 0.14)',
            border: `1px solid ${serverConnected ? 'rgba(0, 245, 160, 0.4)' : 'rgba(255, 75, 92, 0.4)'}`,
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: serverConnected ? 'var(--accent-emerald)' : 'var(--accent-coral)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Server size={14} />
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: serverConnected ? 'var(--accent-emerald)' : 'var(--accent-coral)',
              boxShadow: serverConnected ? '0 0 10px var(--accent-emerald)' : '0 0 8px var(--accent-coral)',
            }}
          />
          <span>{serverConnected ? 'AXUM ONLINE' : 'OFFLINE (Reintentar)'}</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Desactivar audio' : 'Activar audio'}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: soundEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Admin Portal Button */}
        <button
          onClick={onOpenAdmin}
          title="Acceder al Portal Administrativo y RRHH"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(79, 172, 254, 0.08) 100%)',
            color: 'var(--accent-cyan)',
            border: '1px solid rgba(0, 242, 254, 0.35)',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            boxShadow: '0 0 10px rgba(0, 242, 254, 0.1)',
            cursor: 'pointer',
          }}
        >
          <Shield size={15} />
          <span>PORTAL ADMIN</span>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Configuración de Terminal"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
