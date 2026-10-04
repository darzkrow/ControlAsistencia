import React, { useState, useEffect } from 'react';
import {
  fetchReporteAsistencias,
  fetchSedes,
  fetchDepartamentos,
  type AsistenciaReporte,
  type Sede,
  type Departamento,
} from '../../services/api';
import {
  ClipboardCheck,
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
  Camera,
  RefreshCw,
} from 'lucide-react';

export const AsistenciasAuditoria: React.FC = () => {
  const [reportes, setReportes] = useState<AsistenciaReporte[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [deptos, setDeptos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [filtroSede, setFiltroSede] = useState<number | undefined>(undefined);
  const [filtroDepto, setFiltroDepto] = useState<number | undefined>(undefined);

  const loadData = async () => {
    setLoading(true);
    const [reps, s, d] = await Promise.all([
      fetchReporteAsistencias(fechaDesde || undefined, fechaHasta || undefined, filtroSede, filtroDepto),
      fetchSedes(),
      fetchDepartamentos(filtroSede),
    ]);
    setReportes(reps);
    setSedes(s);
    setDeptos(d);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [fechaDesde, fechaHasta, filtroSede, filtroDepto]);

  const exportCSV = () => {
    if (reportes.length === 0) return;
    const headers = ['Fecha', 'Cedula', 'Colaborador', 'Sede', 'Departamento', 'Cargo', 'Hora Entrada', 'Hora Salida', 'Minutos Trabajados', 'Puntualidad', 'Minutos Retardo'];
    const rows = reportes.map((r) => [
      r.fecha,
      r.empleado_cedula,
      `"${r.nombre_completo}"`,
      `"${r.nombre_sede || ''}"`,
      `"${r.nombre_departamento || ''}"`,
      `"${r.nombre_cargo || ''}"`,
      r.hora_entrada ? r.hora_entrada.split('T')[1] : '',
      r.hora_salida ? r.hora_salida.split('T')[1] : '',
      r.minutos_trabajados,
      r.puntualidad || '',
      r.minutos_retardo,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_asistencia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPuntuales = reportes.filter((r) => r.puntualidad === 'Puntual').length;
  const totalRetardos = reportes.filter((r) => r.puntualidad === 'Retardo').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Auditoría y Evaluación de Asistencia</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Supervisión de jornadas, puntualidad contra horarios y control de horas laboradas.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={reportes.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent-cyan)',
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* KPI mini strip */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(8, 12, 22, 0.6)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardCheck size={16} color="var(--accent-cyan)" />
          <span>Total Evaluaciones: <strong>{reportes.length}</strong></span>
        </div>
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 245, 160, 0.1)', border: '1px solid rgba(0, 245, 160, 0.3)', color: 'var(--accent-emerald)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>Marcaciones Puntuales: <strong>{totalPuntuales}</strong></span>
        </div>
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 183, 3, 0.1)', border: '1px solid rgba(255, 183, 3, 0.3)', color: 'var(--accent-amber)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          <span>Retardos Identificados: <strong>{totalRetardos}</strong></span>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>DESDE:</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(8, 12, 22, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.8rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>HASTA:</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(8, 12, 22, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.8rem',
            }}
          />
        </div>

        <select
          value={filtroSede || ''}
          onChange={(e) => setFiltroSede(e.target.value ? Number(e.target.value) : undefined)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(8, 12, 22, 0.9)',
            border: '1px solid var(--border-subtle)',
            color: '#fff',
            fontSize: '0.82rem',
          }}
        >
          <option value="">Todas las Sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>

        <select
          value={filtroDepto || ''}
          onChange={(e) => setFiltroDepto(e.target.value ? Number(e.target.value) : undefined)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(8, 12, 22, 0.9)',
            border: '1px solid var(--border-subtle)',
            color: '#fff',
            fontSize: '0.82rem',
          }}
        >
          <option value="">Todos los Departamentos</option>
          {deptos.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>
      </div>

      {/* Report Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px' }}>FECHA</th>
              <th style={{ padding: '12px' }}>COLABORADOR</th>
              <th style={{ padding: '12px' }}>SEDE / DEPTO</th>
              <th style={{ padding: '12px' }}>ENTRADA</th>
              <th style={{ padding: '12px' }}>SALIDA</th>
              <th style={{ padding: '12px' }}>TIEMPO TRABAJADO</th>
              <th style={{ padding: '12px' }}>EVALUACIÓN PUNTUALIDAD</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>EVIDENCIA</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  Cargando registros de auditoría...
                </td>
              </tr>
            ) : reportes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron registros de asistencia para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              reportes.map((r, i) => {
                const isPuntual = r.puntualidad === 'Puntual';
                const isRetardo = r.puntualidad === 'Retardo';
                const badgeColor = isPuntual
                  ? 'var(--accent-emerald)'
                  : isRetardo
                  ? 'var(--accent-amber)'
                  : 'var(--accent-cyan)';

                const formatTime = (ts?: string) => {
                  if (!ts) return '--:--:--';
                  return ts.includes('T') ? ts.split('T')[1].substring(0, 8) : ts;
                };

                return (
                  <tr key={`${r.empleado_cedula}-${r.fecha}-${i}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px' }} className="mono">
                      {r.fecha}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{r.nombre_completo}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="mono">
                        C.I. {r.empleado_cedula}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      <div>{r.nombre_sede || 'Sede Principal'}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{r.nombre_departamento}</small>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--accent-emerald)' }} className="mono">
                      {formatTime(r.hora_entrada)}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--accent-cyan)' }} className="mono">
                      {formatTime(r.hora_salida)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div className="mono" style={{ fontWeight: 700, color: '#fff' }}>
                        {Math.floor(r.minutos_trabajados / 60)}h {r.minutos_trabajados % 60}m
                      </div>
                      <small style={{ color: 'var(--text-muted)' }}>{r.estado}</small>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: `${badgeColor}20`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}40`,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {isPuntual && <CheckCircle2 size={12} />}
                        {isRetardo && <AlertTriangle size={12} />}
                        {r.puntualidad}
                        {isRetardo && r.minutos_retardo > 0 && ` (+${r.minutos_retardo}m)`}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        title={r.foto_entrada ? 'Captura biométrica archivada' : 'Sin captura'}
                        style={{
                          display: 'inline-block',
                          padding: '4px',
                          borderRadius: '6px',
                          background: r.foto_entrada ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: r.foto_entrada ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        }}
                      >
                        <Camera size={14} />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
