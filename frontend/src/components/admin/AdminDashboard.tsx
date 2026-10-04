import React, { useEffect, useState } from 'react';
import { fetchDashboardMetrics, type DashboardMetrics } from '../../services/api';
import { Users, Building2, Clock, CheckCircle2, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchDashboardMetrics();
    setMetrics(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner and Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Métricas Ejecutivas y Estado en Tiempo Real</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Supervisión continua de sedes, colaboradores activos y puntualidad de la jornada.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent-cyan)',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'radarSpin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Empleados */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL COLABORADORES</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 242, 254, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="var(--accent-cyan)" />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            {metrics?.total_empleados ?? '-'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            ● {metrics?.empleados_activos ?? '-'} activos en nómina
          </div>
        </div>

        {/* Card 2: Sedes Activas */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SEDES CONECTADAS</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(79, 172, 254, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="var(--accent-blue)" />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            {metrics?.sedes_activas ?? '-'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Estructura física sincronizada
          </div>
        </div>

        {/* Card 3: Asistencias Hoy */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MARCACIONES HOY</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 245, 160, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="var(--accent-emerald)" />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            {metrics?.asistencias_hoy ?? '-'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {metrics?.en_curso_hoy ?? 0} jornadas actualmente en curso
          </div>
        </div>

        {/* Card 4: Puntualidad Global */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ÍNDICE PUNTUALIDAD</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 183, 3, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="var(--accent-amber)" />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            {metrics ? `${metrics.puntualidad_pct.toFixed(1)}%` : '-'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
            Tolerancia configurada por turno
          </div>
        </div>
      </div>

      {/* Organizational Structure Quick Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="var(--accent-emerald)" /> Políticas de Asistencia Automatizadas
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
              <strong>Resolución Day-Rollover:</strong> Si se olvida marcar salida ayer, hoy inicia siempre en ENTRADA.
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)' }} />
              <strong>Anti-Passback Dinámico:</strong> Bloquea doble marcación involuntaria en menos de 15 segundos.
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-amber)' }} />
              <strong>Evaluación de Retardo:</strong> Compara automáticamente contra la hora y tolerancia de cada turno.
            </li>
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--accent-cyan)" /> Estado de Despliegue en Docker
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            El backend opera en modo contenedor aislado con usuario no privilegiado (UID 10001) y pool de conexiones gobernado.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600 }}>
              Pool: 5 Min / 20 Max
            </span>
            <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 245, 160, 0.1)', color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 600 }}>
              Warm Pool Activo
            </span>
            <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
              Test-On-Borrow: Activado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
