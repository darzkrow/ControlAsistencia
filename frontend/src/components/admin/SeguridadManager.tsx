import React, { useState, useEffect } from 'react';
import {
  fetchRoles,
  createRole,
  fetchModelos,
  fetchPoliticasByRol,
  updateRolPoliticas,
  fetchUsuariosAdmin,
  createUsuarioAdmin,
  toggleUsuarioEstado,
  unlockUsuario,
  fetchAuditoriaSeguridad,
  fetchSedes,
  type Rol,
  type ModeloRecurso,
  type RolPoliticaModelo,
  type UsuarioAdmin,
  type AuditoriaSeguridad,
  type Sede,
} from '../../services/api';
import { formatDateTimeTo12h } from '../../utils/dateUtils';
import {
  Shield,
  Users,
  Database,
  History,
  Plus,
  Check,
  X,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Building2,
} from 'lucide-react';

export const SeguridadManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'modelos' | 'roles' | 'usuarios' | 'auditoria'>('modelos');

  // Datasets
  const [roles, setRoles] = useState<Rol[]>([]);
  const [modelos, setModelos] = useState<ModeloRecurso[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaSeguridad[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Model Policy Matrix state
  const [selectedRolId, setSelectedRolId] = useState<number>(1);
  const [currentPoliticas, setCurrentPoliticas] = useState<RolPoliticaModelo[]>([]);
  const [savingPolicies, setSavingPolicies] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [newRoleForm, setNewRoleForm] = useState({ codigo: '', nombre: '', descripcion: '' });

  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    nombre_completo: '',
    rol_id: 2,
    sede_id: undefined as number | undefined,
  });

  const loadData = async () => {
    setLoading(true);
    const [r, m, u, a, s] = await Promise.all([
      fetchRoles(),
      fetchModelos(),
      fetchUsuariosAdmin(),
      fetchAuditoriaSeguridad(),
      fetchSedes(),
    ]);
    setRoles(r);
    setModelos(m);
    setUsuarios(u);
    setAuditoria(a);
    setSedes(s);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cargar políticas cuando cambia el rol seleccionado
  useEffect(() => {
    if (selectedRolId) {
      fetchPoliticasByRol(selectedRolId).then((pols) => {
        // Asegurar que existan políticas para todos los modelos disponibles
        const filled = modelos.map((m) => {
          const found = pols.find((p) => p.modelo_codigo === m.codigo);
          if (found) return found;
          return {
            id: Math.floor(Math.random() * 100000),
            rol_id: selectedRolId,
            modelo_codigo: m.codigo,
            puede_crear: false,
            puede_leer: false,
            puede_actualizar: false,
            puede_eliminar: false,
            puede_exportar: false,
            alcance: 'ninguno' as const,
          };
        });
        setCurrentPoliticas(filled);
      });
    }
  }, [selectedRolId, modelos]);

  // Manejo de actualización de matriz de políticas
  const handleToggleAction = (
    modeloCodigo: string,
    action: 'puede_crear' | 'puede_leer' | 'puede_actualizar' | 'puede_eliminar' | 'puede_exportar'
  ) => {
    setCurrentPoliticas((prev) =>
      prev.map((p) => {
        if (p.modelo_codigo === modeloCodigo) {
          return { ...p, [action]: !p[action] };
        }
        return p;
      })
    );
  };

  const handleScopeChange = (modeloCodigo: string, alcance: 'global' | 'sede' | 'ninguno') => {
    setCurrentPoliticas((prev) =>
      prev.map((p) => {
        if (p.modelo_codigo === modeloCodigo) {
          return { ...p, alcance };
        }
        return p;
      })
    );
  };

  const handleSavePolicies = async () => {
    setSavingPolicies(true);
    await updateRolPoliticas(selectedRolId, currentPoliticas);
    setSavingPolicies(false);
    setFeedbackMsg('Políticas del modelo actualizadas y sincronizadas exitosamente.');
    setTimeout(() => setFeedbackMsg(null), 3500);
    // Refrescar auditoría
    const aud = await fetchAuditoriaSeguridad();
    setAuditoria(aud);
  };

  // Crear nuevo Rol
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.codigo || !newRoleForm.nombre) return;
    const nuevo = await createRole(newRoleForm);
    setNewRoleForm({ codigo: '', nombre: '', descripcion: '' });
    setShowRoleModal(false);
    setRoles((prev) => [...prev, nuevo]);
    setSelectedRolId(nuevo.id);
    setFeedbackMsg(`Rol '${nuevo.nombre}' creado exitosamente.`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Crear nuevo Usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username || !newUserForm.email || !newUserForm.password) return;
    await createUsuarioAdmin(newUserForm);
    setNewUserForm({
      username: '',
      email: '',
      password: '',
      nombre_completo: '',
      rol_id: 2,
      sede_id: undefined,
    });
    setShowUserModal(false);
    setFeedbackMsg('Usuario administrativo creado con políticas de seguridad activas.');
    setTimeout(() => setFeedbackMsg(null), 3500);
    const updatedUsers = await fetchUsuariosAdmin();
    setUsuarios(updatedUsers);
    const updatedAud = await fetchAuditoriaSeguridad();
    setAuditoria(updatedAud);
  };

  const handleToggleUsuario = async (id: number, activo: boolean) => {
    await toggleUsuarioEstado(id, !activo);
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: !activo } : u)));
  };

  const handleUnlockUsuario = async (id: number) => {
    await unlockUsuario(id);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, intentos_fallidos: 0, bloqueado_hasta: undefined } : u))
    );
    setFeedbackMsg('Cuenta desbloqueada satisfactoriamente.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const selectedRoleObj = roles.find((r) => r.id === selectedRolId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Subnav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Seguridad, Roles y Gestión de Modelos</h2>
            {loading && <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Políticas de acceso por modelo de recurso, control de privilegios RBAC/ABAC y auditoría inmutable.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'roles' && (
            <button
              onClick={() => setShowRoleModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                color: '#070a13',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              <Plus size={16} /> Nuevo Rol
            </button>
          )}

          {activeTab === 'usuarios' && (
            <button
              onClick={() => setShowUserModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                color: '#070a13',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              <Plus size={16} /> Nuevo Usuario Admin
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
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

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('modelos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'modelos' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'modelos' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'modelos' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <Sliders size={16} /> Gestión de Políticas de Modelos
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'roles' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'roles' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'roles' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <Shield size={16} /> Roles del Sistema ({roles.length})
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'usuarios' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'usuarios' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'usuarios' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <Users size={16} /> Usuarios Administrativos ({usuarios.length})
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'auditoria' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'auditoria' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'auditoria' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
          }}
        >
          <History size={16} /> Auditoría de Seguridad ({auditoria.length})
        </button>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 1: GESTIÓN DE POLÍTICAS DE MODELOS */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'modelos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Role selector bar & Action bar */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                ROL A CONFIGURAR:
              </span>
              <select
                value={selectedRolId}
                onChange={(e) => setSelectedRolId(Number(e.target.value))}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(8, 12, 22, 0.8)',
                  border: '1px solid var(--accent-cyan)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                }}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre} ({r.codigo})
                  </option>
                ))}
              </select>
              {selectedRoleObj?.es_sistema && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(0, 242, 254, 0.1)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                  }}
                >
                  ROL DEL SISTEMA
                </span>
              )}
            </div>

            <button
              onClick={handleSavePolicies}
              disabled={savingPolicies}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                color: '#070a13',
                fontSize: '0.85rem',
                fontWeight: 800,
                boxShadow: '0 0 15px rgba(0, 242, 254, 0.3)',
              }}
            >
              <Check size={16} />
              {savingPolicies ? 'GUARDANDO...' : 'GUARDAR POLÍTICAS'}
            </button>
          </div>

          {/* Matrix Table */}
          <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>MODELO / RECURSO</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>CREAR</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>LEER</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>ACTUALIZAR</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>ELIMINAR</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>EXPORTAR</th>
                  <th style={{ padding: '12px' }}>ALCANCE (SCOPE)</th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((m) => {
                  const pol = currentPoliticas.find((p) => p.modelo_codigo === m.codigo) || {
                    puede_crear: false,
                    puede_leer: false,
                    puede_actualizar: false,
                    puede_eliminar: false,
                    puede_exportar: false,
                    alcance: 'ninguno',
                  };

                  const isCrearAvail = m.acciones_disponibles.includes('crear');
                  const isActAvail = m.acciones_disponibles.includes('actualizar');
                  const isDelAvail = m.acciones_disponibles.includes('eliminar');
                  const isExpAvail = m.acciones_disponibles.includes('exportar');

                  return (
                    <tr key={m.codigo} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Database size={15} color="var(--accent-cyan)" />
                          <div>
                            <span style={{ fontWeight: 700, color: '#fff' }}>{m.nombre}</span>
                            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              ({m.codigo})
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.descripcion}</div>
                          </div>
                        </div>
                      </td>

                      {/* Checkbox Crear */}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isCrearAvail ? (
                          <input
                            type="checkbox"
                            checked={pol.puede_crear}
                            onChange={() => handleToggleAction(m.codigo, 'puede_crear')}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Checkbox Leer */}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={pol.puede_leer}
                          onChange={() => handleToggleAction(m.codigo, 'puede_leer')}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                        />
                      </td>

                      {/* Checkbox Actualizar */}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isActAvail ? (
                          <input
                            type="checkbox"
                            checked={pol.puede_actualizar}
                            onChange={() => handleToggleAction(m.codigo, 'puede_actualizar')}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Checkbox Eliminar */}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isDelAvail ? (
                          <input
                            type="checkbox"
                            checked={pol.puede_eliminar}
                            onChange={() => handleToggleAction(m.codigo, 'puede_eliminar')}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-coral)' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Checkbox Exportar */}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isExpAvail ? (
                          <input
                            type="checkbox"
                            checked={pol.puede_exportar}
                            onChange={() => handleToggleAction(m.codigo, 'puede_exportar')}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-emerald)' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Scope Select */}
                      <td style={{ padding: '12px' }}>
                        <select
                          value={pol.alcance}
                          onChange={(e) =>
                            handleScopeChange(m.codigo, e.target.value as 'global' | 'sede' | 'ninguno')
                          }
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            background: 'rgba(8, 12, 22, 0.8)',
                            border: '1px solid var(--border-subtle)',
                            color:
                              pol.alcance === 'global'
                                ? 'var(--accent-cyan)'
                                : pol.alcance === 'sede'
                                ? 'var(--accent-emerald)'
                                : 'var(--text-muted)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <option value="global">Global (Todas las sedes)</option>
                          {m.soporta_alcance_sede && <option value="sede">Sede Asignada del Usuario</option>}
                          <option value="ninguno">Ninguno (Denegar acceso)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 2: ROLES DEL SISTEMA */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'roles' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>CÓDIGO</th>
                <th style={{ padding: '12px' }}>NOMBRE DEL ROL</th>
                <th style={{ padding: '12px' }}>DESCRIPCIÓN</th>
                <th style={{ padding: '12px' }}>TIPO</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="mono" style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {r.codigo}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>{r.nombre}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{r.descripcion || 'Sin descripción'}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: r.es_sistema ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        color: r.es_sistema ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {r.es_sistema ? 'SISTEMA' : 'PERSONALIZADO'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedRolId(r.id);
                        setActiveTab('modelos');
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 242, 254, 0.1)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Configurar Modelos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 3: USUARIOS ADMINISTRATIVOS */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'usuarios' && (
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>USUARIO</th>
                <th style={{ padding: '12px' }}>NOMBRE COMPLETO</th>
                <th style={{ padding: '12px' }}>ROL ASIGNADO</th>
                <th style={{ padding: '12px' }}>ALCANCE DE SEDE</th>
                <th style={{ padding: '12px' }}>SEGURIDAD / INTENTOS</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>ESTADO</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>DESBLOQUEO</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="mono" style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {u.username}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{u.nombre_completo}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(0, 242, 254, 0.1)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {u.rol_nombre}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={13} color="var(--accent-blue)" />
                      {u.sede_nombre || 'Todas (Global)'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {u.intentos_fallidos > 0 ? (
                      <span style={{ color: 'var(--accent-coral)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} /> {u.intentos_fallidos} intentos fallidos
                      </span>
                    ) : (
                      <span style={{ color: 'var(--accent-emerald)', fontSize: '0.75rem' }}>Protegido (0 fallos)</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleUsuario(u.id, u.activo)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: u.activo ? 'rgba(0, 245, 160, 0.15)' : 'rgba(255, 75, 92, 0.15)',
                        color: u.activo ? 'var(--accent-emerald)' : 'var(--accent-coral)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {u.activo ? 'ACTIVO' : 'INACTIVO'}
                    </button>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {u.bloqueado_hasta || u.intentos_fallidos > 0 ? (
                      <button
                        onClick={() => handleUnlockUsuario(u.id)}
                        title="Desbloquear usuario manualmente"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255, 184, 0, 0.2)',
                          color: 'var(--accent-amber)',
                          border: '1px solid var(--accent-amber)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Unlock size={12} /> Desbloquear
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 4: AUDITORÍA DE SEGURIDAD */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'auditoria' && (
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>FECHA / HORA</th>
                <th style={{ padding: '12px' }}>ACCIÓN</th>
                <th style={{ padding: '12px' }}>MÓDULO</th>
                <th style={{ padding: '12px' }}>USUARIO</th>
                <th style={{ padding: '12px' }}>DETALLES</th>
                <th style={{ padding: '12px' }}>IP ORIGEN</th>
              </tr>
            </thead>
            <tbody>
              {auditoria.map((a) => {
                const isFail = a.accion.includes('FALLIDO') || a.accion.includes('BLOQUEADO');
                const isSuccess = a.accion.includes('EXITOSO');
                const badgeColor = isFail
                  ? 'var(--accent-coral)'
                  : isSuccess
                  ? 'var(--accent-emerald)'
                  : 'var(--accent-cyan)';

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="mono" style={{ padding: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {formatDateTimeTo12h(a.fecha_hora)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: badgeColor,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: `1px solid ${badgeColor}`,
                        }}
                      >
                        {a.accion}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>{a.modulo}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{a.usuario_email || 'Sistema'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.detalles}</td>
                    <td className="mono" style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {a.ip_origen || '127.0.0.1'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Crear Nuevo Rol */}
      {showRoleModal && (
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
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '460px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Definir Nuevo Rol de Seguridad</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                  CÓDIGO ÚNICO DEL ROL:
                </label>
                <input
                  type="text"
                  placeholder="ej: SUPERVISOR_TURNO_NOCHE"
                  value={newRoleForm.codigo}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, codigo: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(8, 12, 22, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontFamily: 'monospace',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                  NOMBRE DESCRIPTIVO:
                </label>
                <input
                  type="text"
                  placeholder="ej: Supervisor de Turno Nocturno"
                  value={newRoleForm.nombre}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, nombre: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(8, 12, 22, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                  DESCRIPCIÓN DE ALCANCE:
                </label>
                <textarea
                  placeholder="Responsabilidades y modelos que podrá administrar..."
                  value={newRoleForm.descripcion}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, descripcion: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(8, 12, 22, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                  color: '#070a13',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                CREAR ROL Y HABILITAR MATRIZ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Usuario Admin */}
      {showUserModal && (
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
          onClick={() => setShowUserModal(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '480px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Nuevo Usuario Administrativo</h3>
              <button
                onClick={() => setShowUserModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                  NOMBRE COMPLETO:
                </label>
                <input
                  type="text"
                  placeholder="ej: Lic. Carlos Valera"
                  value={newUserForm.nombre_completo}
                  onChange={(e) => setNewUserForm({ ...newUserForm, nombre_completo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(8, 12, 22, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    USUARIO (LOGIN):
                  </label>
                  <input
                    type="text"
                    placeholder="cvalera"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(8, 12, 22, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    CONTRASEÑA:
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(8, 12, 22, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                  CORREO ELECTRÓNICO CORPORATIVO:
                </label>
                <input
                  type="email"
                  placeholder="cvalera@rapture.corp"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(8, 12, 22, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    ROL ASIGNADO:
                  </label>
                  <select
                    value={newUserForm.rol_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, rol_id: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(8, 12, 22, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                    }}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    SEDE ASIGNADA (ALCANCE):
                  </label>
                  <select
                    value={newUserForm.sede_id || ''}
                    onChange={(e) =>
                      setNewUserForm({
                        ...newUserForm,
                        sede_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(8, 12, 22, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                    }}
                  >
                    <option value="">Todas las Sedes (Global)</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                  color: '#070a13',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                REGISTRAR USUARIO ADMINISTRATIVO
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
