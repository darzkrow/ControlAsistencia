import React from 'react';
import type { EventoReciente } from '../services/api';
import { History, Camera, Fingerprint, ShieldCheck } from 'lucide-react';

interface RecentEventsProps {
  events: EventoReciente[];
  onSelectCedula: (cedula: number) => void;
}

export const RecentEvents: React.FC<RecentEventsProps> = ({ events, onSelectCedula }) => {
  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        width: '100%',
        maxWidth: '520px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={16} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            REGISTROS RECIENTES DEL TERMINAL
          </h4>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {events.length} evento(s)
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No hay registros de marcaje en esta sesión.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
          {events.map((ev) => {
            const isEntrada = ev.tipo.toLowerCase() === 'entrada';
            const isSalida = ev.tipo.toLowerCase() === 'salida';
            const badgeColor = isEntrada
              ? 'var(--accent-emerald)'
              : isSalida
              ? 'var(--accent-cyan)'
              : 'var(--accent-amber)';

            return (
              <div
                key={ev.id}
                onClick={() => onSelectCedula(ev.cedula)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(8, 12, 22, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ev.metodo === 'huella' ? (
                      <Fingerprint size={16} color="var(--accent-cyan)" />
                    ) : ev.metodo === 'dual' ? (
                      <ShieldCheck size={16} color="var(--accent-emerald)" />
                    ) : (
                      <Camera size={16} color="var(--accent-blue)" />
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ev.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="mono">
                      C.I. {ev.cedula} {ev.departamento ? `• ${ev.departamento}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: `${badgeColor}20`,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}40`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {ev.tipo}
                  </span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }} className="mono">
                    {ev.timestamp}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
