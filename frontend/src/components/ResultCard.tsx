import React, { useEffect, useState } from 'react';
import type { EscaneoResponse } from '../services/api';
import { CheckCircle2, XCircle, AlertTriangle, User, Building, Clock, Camera } from 'lucide-react';

interface ResultCardProps {
  result: EscaneoResponse;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onDismiss,
  autoDismissMs = 7000,
}) => {
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoDismissMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [autoDismissMs, onDismiss]);

  const isSuccess = result.es_empleado && (result.tipo_evento === 'entrada' || result.tipo_evento === 'salida');
  const isVisitor = result.tipo_evento === 'visitante';
  const isCooldown = result.tipo_evento === 'cooldown';

  const borderColor = isSuccess
    ? result.tipo_evento === 'entrada'
      ? 'var(--accent-emerald)'
      : 'var(--accent-cyan)'
    : isVisitor || isCooldown
    ? 'var(--accent-amber)'
    : 'var(--accent-coral)';

  const headerBg = isSuccess
    ? result.tipo_evento === 'entrada'
      ? 'rgba(0, 245, 160, 0.15)'
      : 'rgba(0, 242, 254, 0.15)'
    : isVisitor || isCooldown
    ? 'rgba(255, 183, 3, 0.15)'
    : 'rgba(255, 75, 92, 0.15)';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(4, 6, 12, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 35px ${borderColor}40`,
          position: 'relative',
        }}
      >
        {/* Top Auto-dismiss progress countdown line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '4px',
            width: `${progress}%`,
            background: borderColor,
            transition: 'width 0.05s linear',
          }}
        />

        {/* Header Ribbon */}
        <div
          style={{
            padding: '20px',
            background: headerBg,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {isSuccess ? (
            <CheckCircle2 size={36} color={borderColor} />
          ) : isVisitor || isCooldown ? (
            <AlertTriangle size={36} color={borderColor} />
          ) : (
            <XCircle size={36} color={borderColor} />
          )}

          <div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: borderColor,
              }}
            >
              EVENTO: {result.tipo_evento.toUpperCase()}
            </span>
            <h3 style={{ fontSize: '1.25rem', marginTop: '2px', color: '#fff' }}>
              {result.mensaje}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {/* Detected Face Picture with OpenCV Green Rectangle */}
          {result.foto_detectada_b64 && (
            <div style={{ marginBottom: '18px', textAlign: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '2px solid var(--accent-emerald)',
                  boxShadow: '0 0 20px rgba(0,245,160,0.3)',
                }}
              >
                <img
                  src={`data:image/jpeg;base64,${result.foto_detectada_b64}`}
                  alt="Rostro verificado"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)',
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: 'var(--accent-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Camera size={12} /> ROSTRO VALIDADO POR OPENCV
                </div>
              </div>
            </div>
          )}

          {/* Employee Meta Info */}
          {result.nombre_completo && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: 'rgba(8, 12, 22, 0.7)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={18} color="var(--accent-cyan)" />
                <div>
                  <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>COLABORADOR</small>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{result.nombre_completo}</div>
                </div>
              </div>

              {result.departamento && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building size={18} color="var(--accent-blue)" />
                  <div>
                    <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DEPARTAMENTO</small>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {result.departamento}
                    </div>
                  </div>
                </div>
              )}

              {result.minutos_acumulados !== undefined && result.minutos_acumulados > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={18} color="var(--accent-emerald)" />
                  <div>
                    <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TIEMPO TRABAJADO HOY</small>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-emerald)' }}>
                      {Math.floor(result.minutos_acumulados / 60)}h {result.minutos_acumulados % 60}m
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
