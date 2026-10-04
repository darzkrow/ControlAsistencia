import React, { useState, useEffect } from 'react';
import {
  fetchSedes,
  createSede,
  fetchDepartamentos,
  createDepartamento,
  fetchCargos,
  createCargo,
  fetchTurnos,
  createTurno,
  type Sede,
  type Departamento,
  type Cargo,
  type Turno,
} from '../../services/api';
import { Building2, Layers, Briefcase, Clock, Plus, X, Check, MapPin, RefreshCw } from 'lucide-react';

export const OrganizacionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sedes' | 'deptos' | 'cargos' | 'turnos'>('sedes');

  // Datasets
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [deptos, setDeptos] = useState<Departamento[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedSedeFilter, setSelectedSedeFilter] = useState<number | undefined>(undefined);
  const [selectedDeptoFilter, setSelectedDeptoFilter] = useState<number | undefined>(undefined);

  // Modal States
  const [showModal, setShowModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Form states
  const [sedeForm, setSedeForm] = useState({ codigo: '', nombre: '', direccion: '', ciudad: '' });
  const [deptoForm, setDeptoForm] = useState({ sede_id: 0, codigo: '', nombre: '' });
  const [cargoForm, setCargoForm] = useState({ departamento_id: 0, nombre: '', descripcion: '' });
  const [turnoForm, setTurnoForm] = useState({
    nombre: '',
    hora_entrada: '08:00',
    hora_salida: '17:00',
    tolerancia_minutos: 15,
    dias_laborales: 'L,M,X,J,V',
  });

  const loadAll = async () => {
    setLoading(true);
    const [s, d, c, t] = await Promise.all([
      fetchSedes(),
      fetchDepartamentos(selectedSedeFilter),
      fetchCargos(selectedDeptoFilter),
      fetchTurnos(),
    ]);
    setSedes(s);
    setDeptos(d);
    setCargos(c);
    setTurnos(t);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [selectedSedeFilter, selectedDeptoFilter]);

  const handleCreateSede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeForm.codigo || !sedeForm.nombre) return;
    await createSede(sedeForm);
    setSedeForm({ codigo: '', nombre: '', direccion: '', ciudad: '' });
    setShowModal(false);
    setFeedbackMsg('Sede registrada exitosamente');
    setTimeout(() => setFeedbackMsg(null), 3000);
    loadAll();
  };

  const handleCreateDepto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptoForm.sede_id || !deptoForm.codigo || !deptoForm.nombre) return;
    await createDepartamento(deptoForm);
    setDeptoForm({ sede_id: 0, codigo: '', nombre: '' });
    setShowModal(false);
    setFeedbackMsg('Departamento registrado exitosamente');
    setTimeout(() => setFeedbackMsg(null), 3000);
    loadAll();
  };

  const handleCreateCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoForm.departamento_id || !cargoForm.nombre) return;
    await createCargo(cargoForm);
    setCargoForm({ departamento_id: 0, nombre: '', descripcion: '' });
    setShowModal(false);
    setFeedbackMsg('Cargo laboral registrado exitosamente');
    setTimeout(() => setFeedbackMsg(null), 3000);
    loadAll();
  };

  const handleCreateTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoForm.nombre) return;
    await createTurno(turnoForm);
    setTurnoForm({
      nombre: '',
      hora_entrada: '08:00',
      hora_salida: '17:00',
      tolerancia_minutos: 15,
      dias_laborales: 'L,M,X,J,V',
    });
    setShowModal(false);
    setFeedbackMsg('Turno horario registrado exitosamente');
    setTimeout(() => setFeedbackMsg(null), 3000);
    loadAll();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Subnavigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Estructura Organizativa Dinámica</h2>
            {loading && (
              <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Gestión jerárquica y en vivo de Sedes, Oficinas/Departamentos, Cargos y Turnos Horarios.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
            color: '#070a13',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <Plus size={16} />
          {activeTab === 'sedes' && 'Nueva Sede'}
          {activeTab === 'deptos' && 'Nuevo Departamento'}
          {activeTab === 'cargos' && 'Nuevo Cargo'}
          {activeTab === 'turnos' && 'Nuevo Turno Horario'}
        </button>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(0, 245, 160, 0.15)',
            border: '1px solid var(--accent-emerald)',
            color: 'var(--accent-emerald)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} /> {feedbackMsg}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('sedes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'sedes' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'sedes' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'sedes' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <Building2 size={16} /> Sedes ({sedes.length})
        </button>

        <button
          onClick={() => setActiveTab('deptos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'deptos' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'deptos' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'deptos' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <Layers size={16} /> Departamentos ({deptos.length})
        </button>

        <button
          onClick={() => setActiveTab('cargos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'cargos' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'cargos' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'cargos' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <Briefcase size={16} /> Cargos y Roles ({cargos.length})
        </button>

        <button
          onClick={() => setActiveTab('turnos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'turnos' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'turnos' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'turnos' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <Clock size={16} /> Turnos y Horarios ({turnos.length})
        </button>
      </div>

      {/* Tab 1: Sedes Table */}
      {activeTab === 'sedes' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>CÓDIGO</th>
                <th style={{ padding: '12px' }}>NOMBRE DE LA SEDE</th>
                <th style={{ padding: '12px' }}>CIUDAD</th>
                <th style={{ padding: '12px' }}>DIRECCIÓN</th>
                <th style={{ padding: '12px' }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {sedes.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="mono" style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {s.codigo}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{s.nombre}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {s.ciudad || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{s.direccion || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(0, 245, 160, 0.1)', color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 700 }}>
                      ACTIVA
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Departamentos Table with Sede Filter */}
      {activeTab === 'deptos' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>FILTRAR POR SEDE:</label>
            <select
              value={selectedSedeFilter || ''}
              onChange={(e) => setSelectedSedeFilter(e.target.value ? Number(e.target.value) : undefined)}
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
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>CÓDIGO</th>
                <th style={{ padding: '12px' }}>DEPARTAMENTO</th>
                <th style={{ padding: '12px' }}>SEDE ASIGNADA</th>
                <th style={{ padding: '12px' }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {deptos.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="mono" style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {d.codigo}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{d.nombre}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{d.nombre_sede || 'General'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(0, 245, 160, 0.1)', color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 700 }}>
                      ACTIVO
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Cargos Table with Depto Filter */}
      {activeTab === 'cargos' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>FILTRAR POR DEPARTAMENTO:</label>
            <select
              value={selectedDeptoFilter || ''}
              onChange={(e) => setSelectedDeptoFilter(e.target.value ? Number(e.target.value) : undefined)}
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
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.nombre_sede})
                </option>
              ))}
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>CARGO / POSICIÓN</th>
                <th style={{ padding: '12px' }}>DEPARTAMENTO</th>
                <th style={{ padding: '12px' }}>DESCRIPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {cargos.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>{c.nombre}</td>
                  <td style={{ padding: '12px', color: 'var(--accent-cyan)' }}>{c.nombre_departamento}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{c.descripcion || 'Sin descripción'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Turnos Horarios Table */}
      {activeTab === 'turnos' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>TURNO</th>
                <th style={{ padding: '12px' }}>HORARIO OFICIAL</th>
                <th style={{ padding: '12px' }}>TOLERANCIA</th>
                <th style={{ padding: '12px' }}>DÍAS</th>
                <th style={{ padding: '12px' }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>{t.nombre}</td>
                  <td style={{ padding: '12px' }} className="mono">
                    <span style={{ color: 'var(--accent-emerald)' }}>{t.hora_entrada}</span> - <span style={{ color: 'var(--accent-coral)' }}>{t.hora_salida}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{t.tolerancia_minutos} minutos</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{t.dias_laborales}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(0, 245, 160, 0.1)', color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 700 }}>
                      ACTIVO
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 6, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '20px',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '480px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>
                {activeTab === 'sedes' && 'Registrar Nueva Sede'}
                {activeTab === 'deptos' && 'Registrar Nuevo Departamento'}
                {activeTab === 'cargos' && 'Registrar Nuevo Cargo'}
                {activeTab === 'turnos' && 'Registrar Nuevo Turno Horario'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Sede Form */}
            {activeTab === 'sedes' && (
              <form onSubmit={handleCreateSede} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>CÓDIGO (EJ: SEDE-SUR)</label>
                  <input
                    type="text"
                    required
                    value={sedeForm.codigo}
                    onChange={(e) => setSedeForm({ ...sedeForm, codigo: e.target.value })}
                    placeholder="SEDE-SUR"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>NOMBRE DE LA SEDE</label>
                  <input
                    type="text"
                    required
                    value={sedeForm.nombre}
                    onChange={(e) => setSedeForm({ ...sedeForm, nombre: e.target.value })}
                    placeholder="Sede Regional Occidente"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>CIUDAD</label>
                  <input
                    type="text"
                    value={sedeForm.ciudad}
                    onChange={(e) => setSedeForm({ ...sedeForm, ciudad: e.target.value })}
                    placeholder="Maracaibo"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>DIRECCIÓN FÍSICA</label>
                  <input
                    type="text"
                    value={sedeForm.direccion}
                    onChange={(e) => setSedeForm({ ...sedeForm, direccion: e.target.value })}
                    placeholder="Av. 5 de Julio con Calle 72"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    marginTop: '10px',
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                    color: '#070a13',
                    fontWeight: 700,
                  }}
                >
                  Guardar Sede
                </button>
              </form>
            )}

            {/* Departamento Form */}
            {activeTab === 'deptos' && (
              <form onSubmit={handleCreateDepto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>SEDE PERTENECIENTE</label>
                  <select
                    required
                    value={deptoForm.sede_id}
                    onChange={(e) => setDeptoForm({ ...deptoForm, sede_id: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  >
                    <option value="">Seleccione una sede...</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>CÓDIGO (EJ: DEP-FINANZAS)</label>
                  <input
                    type="text"
                    required
                    value={deptoForm.codigo}
                    onChange={(e) => setDeptoForm({ ...deptoForm, codigo: e.target.value })}
                    placeholder="DEP-FINANZAS"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>NOMBRE DEL DEPARTAMENTO</label>
                  <input
                    type="text"
                    required
                    value={deptoForm.nombre}
                    onChange={(e) => setDeptoForm({ ...deptoForm, nombre: e.target.value })}
                    placeholder="Administración y Finanzas"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    marginTop: '10px',
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                    color: '#070a13',
                    fontWeight: 700,
                  }}
                >
                  Guardar Departamento
                </button>
              </form>
            )}

            {/* Cargo Form */}
            {activeTab === 'cargos' && (
              <form onSubmit={handleCreateCargo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>DEPARTAMENTO PERTENECIENTE</label>
                  <select
                    required
                    value={cargoForm.departamento_id}
                    onChange={(e) => setCargoForm({ ...cargoForm, departamento_id: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  >
                    <option value="">Seleccione un departamento...</option>
                    {deptos.map((d) => (
                      <option key={d.id} value={d.id}>{d.nombre} ({d.nombre_sede})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>NOMBRE DEL CARGO</label>
                  <input
                    type="text"
                    required
                    value={cargoForm.nombre}
                    onChange={(e) => setCargoForm({ ...cargoForm, nombre: e.target.value })}
                    placeholder="Analista Contable Senior"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>DESCRIPCIÓN</label>
                  <input
                    type="text"
                    value={cargoForm.descripcion}
                    onChange={(e) => setCargoForm({ ...cargoForm, descripcion: e.target.value })}
                    placeholder="Responsable de balances y nómina mensual"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    marginTop: '10px',
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                    color: '#070a13',
                    fontWeight: 700,
                  }}
                >
                  Guardar Cargo
                </button>
              </form>
            )}

            {/* Turno Form */}
            {activeTab === 'turnos' && (
              <form onSubmit={handleCreateTurno} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>NOMBRE DEL TURNO</label>
                  <input
                    type="text"
                    required
                    value={turnoForm.nombre}
                    onChange={(e) => setTurnoForm({ ...turnoForm, nombre: e.target.value })}
                    placeholder="Turno Nocturno de Seguridad"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>HORA ENTRADA</label>
                    <input
                      type="time"
                      required
                      value={turnoForm.hora_entrada}
                      onChange={(e) => setTurnoForm({ ...turnoForm, hora_entrada: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>HORA SALIDA</label>
                    <input
                      type="time"
                      required
                      value={turnoForm.hora_salida}
                      onChange={(e) => setTurnoForm({ ...turnoForm, hora_salida: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>TOLERANCIA (MINUTOS)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={turnoForm.tolerancia_minutos}
                    onChange={(e) => setTurnoForm({ ...turnoForm, tolerancia_minutos: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>DÍAS LABORABLES</label>
                  <input
                    type="text"
                    value={turnoForm.dias_laborales}
                    onChange={(e) => setTurnoForm({ ...turnoForm, dias_laborales: e.target.value })}
                    placeholder="L,M,X,J,V"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    marginTop: '10px',
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                    color: '#070a13',
                    fontWeight: 700,
                  }}
                >
                  Guardar Turno
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
