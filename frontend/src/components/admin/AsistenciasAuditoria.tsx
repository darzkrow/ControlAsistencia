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
import { formatTimeTo12h } from '../../utils/dateUtils';

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
  const [filtroSoloFraude, setFiltroSoloFraude] = useState<boolean>(false);

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
    const headers = ['Fecha', 'Cedula', 'Colaborador', 'Sede', 'Departamento', 'Cargo', 'Hora Entrada', 'Hora Salida', 'Minutos Trabajados', 'Puntualidad', 'Minutos Retardo', 'Geovalla GPS', 'Distancia Metros'];
    const rows = reportes.map((r) => [
      r.fecha,
      r.empleado_cedula,
      `"${r.nombre_completo}"`,
      `"${r.nombre_sede || ''}"`,
      `"${r.nombre_departamento || ''}"`,
      `"${r.nombre_cargo || ''}"`,
      r.hora_entrada ? formatTimeTo12h(r.hora_entrada, true) : '',
      r.hora_salida ? formatTimeTo12h(r.hora_salida, true) : '',
      r.minutos_trabajados,
      r.puntualidad || '',
      r.minutos_retardo,
      r.alerta_fraude_rrhh || r.fuera_de_sede_entrada ? 'ALERTA_FUERA_DE_SEDE' : 'DENTRO_DE_SEDE',
      r.distancia_sede_entrada || 0,
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
  const totalAlertasFraude = reportes.filter((r) => r.alerta_fraude_rrhh || r.fuera_de_sede_entrada).length;

  const reportesVisibles = filtroSoloFraude
    ? reportes.filter((r) => r.alerta_fraude_rrhh || r.fuera_de_sede_entrada)
    : reportes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Auditoría y Evaluación de Asistencia</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Supervisión de jornadas, puntualidad contra horarios y control de geovallas GPS anti-fraude.
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
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          <span>Alertas Fuera de Sede (GPS): <strong>{totalAlertasFraude}</strong></span>
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

        {/* Boton para filtrar solo alertas de fraude fuera de sede */}
        <button
          onClick={() => setFiltroSoloFraude(!filtroSoloFraude)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            background: filtroSoloFraude ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: filtroSoloFraude ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-subtle)',
            color: filtroSoloFraude ? '#ef4444' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          <AlertTriangle size={14} />
          {filtroSoloFraude ? 'Mostrando: Solo Alertas Fuera de Sede' : 'Filtrar Alertas Fuera de Sede'}
        </button>
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
              <th style={{ padding: '12px' }}>GEOVALLA GPS / AUDITORIA</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>EVIDENCIA</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  Cargando registros de auditoría...
                </td>
              </tr>
            ) : reportesVisibles.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron registros de asistencia para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              reportesVisibles.map((r, i) => {
                const isPuntual = r.puntualidad === 'Puntual';
                const isRetardo = r.puntualidad === 'Retardo';
                const badgeColor = isPuntual
                  ? 'var(--accent-emerald)'
                  : isRetardo
                  ? 'var(--accent-amber)'
                  : 'var(--accent-cyan)';

                const formatTime = (ts?: string) => formatTimeTo12h(ts, true);
                const isFueraDeSede = r.alerta_fraude_rrhh || r.fuera_de_sede_entrada;

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
                    <td style={{ padding: '12px' }}>
                      {isFueraDeSede ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <AlertTriangle size={12} />
                            ALERTA: FUERA DE SEDE ({r.distancia_sede_entrada || 0}m)
                          </span>
                          {r.latitud_entrada && r.longitud_entrada && (
                            <a
                              href={`https://www.google.com/maps?q=${r.latitud_entrada},${r.longitud_entrada}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: 'var(--accent-cyan)',
                                marginTop: '4px',
                                textDecoration: 'none',
                              }}
                            >
                              Ver Mapa GPS ({Number(r.latitud_entrada).toFixed(4)}, {Number(r.longitud_entrada).toFixed(4)})
                            </a>
                          )}
                        </div>
                      ) : r.distancia_sede_entrada !== undefined && r.distancia_sede_entrada !== null ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--accent-emerald)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={12} />
                          EN SEDE ({r.distancia_sede_entrada}m)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          TERMINAL LOCAL
                        </span>
                      )}
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
