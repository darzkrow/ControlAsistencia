import React, { useState, useEffect, useRef } from 'react';
import {
  fetchEmpleados,
  createEmpleado,
  toggleEmpleadoEstado,
  fetchSedes,
  fetchDepartamentos,
  fetchCargos,
  fetchTurnos,
  type EmpleadoDetallado,
  type Sede,
  type Departamento,
  type Cargo,
  type Turno,
} from '../../services/api';
import {
  UserPlus,
  Search,
  Camera,
  Fingerprint,
  Check,
  X,
  Building2,
  Briefcase,
  Clock,
  Power,
  RefreshCw,
} from 'lucide-react';

export const EmpleadosManager: React.FC = () => {
  const [empleados, setEmpleados] = useState<EmpleadoDetallado[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [deptos, setDeptos] = useState<Departamento[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSede, setFilterSede] = useState<number | undefined>(undefined);
  const [filterDepto, setFilterDepto] = useState<number | undefined>(undefined);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Form State
  const [formCedula, setFormCedula] = useState<string>('');
  const [formNombre, setFormNombre] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formTelefono, setFormTelefono] = useState<string>('');
  const [formSedeId, setFormSedeId] = useState<number | undefined>(undefined);
  const [formDeptoId, setFormDeptoId] = useState<number | undefined>(undefined);
  const [formCargoId, setFormCargoId] = useState<number | undefined>(undefined);
  const [formTurnoId, setFormTurnoId] = useState<number | undefined>(undefined);
  const [formFotoB64, setFormFotoB64] = useState<string | null>(null);
  const [formHuella, setFormHuella] = useState<string | null>(null);

  // Live Camera preview inside modal
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [emps, s, d, c, t] = await Promise.all([
      fetchEmpleados(filterSede, filterDepto),
      fetchSedes(),
      fetchDepartamentos(filterSede),
      fetchCargos(filterDepto),
      fetchTurnos(),
    ]);
    setEmpleados(emps);
    setSedes(s);
    setDeptos(d);
    setCargos(c);
    setTurnos(t);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filterSede, filterDepto]);

  // Dynamic cascading departments when form Sede changes
  const formDeptosDisponibles = formSedeId
    ? deptos.filter((d) => d.sede_id === formSedeId)
    : deptos;

  // Dynamic cascading roles when form Depto changes
  const formCargosDisponibles = formDeptoId
    ? cargos.filter((c) => c.departamento_id === formDeptoId)
    : cargos;

  // Webcam handler
  const startCamera = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error al abrir cámara para enrolamiento:', err);
    }
  };

  const takeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 400, 400);
        const b64 = canvas.toDataURL('image/jpeg', 0.9);
        setFormFotoB64(b64);
        setUseCamera(false);
        if (video.srcObject) {
          (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = parseInt(formCedula, 10);
    if (isNaN(idNum) || !formNombre) return;

    await createEmpleado({
      cedula: idNum,
      nombre_completo: formNombre,
      email: formEmail || undefined,
      telefono: formTelefono || undefined,
      sede_id: formSedeId,
      departamento_id: formDeptoId,
      cargo_id: formCargoId,
      turno_id: formTurnoId,
      foto_b64: formFotoB64 || undefined,
      template_huella: formHuella || undefined,
    });

    setFeedbackMsg(`Colaborador '${formNombre}' registrado exitosamente.`);
    setTimeout(() => setFeedbackMsg(null), 3500);

    // Reset Form
    setFormCedula('');
    setFormNombre('');
    setFormEmail('');
    setFormTelefono('');
    setFormSedeId(undefined);
    setFormDeptoId(undefined);
    setFormCargoId(undefined);
    setFormTurnoId(undefined);
    setFormFotoB64(null);
    setFormHuella(null);
    setShowModal(false);
    loadData();
  };

  const handleToggleEstado = async (cedula: number, currentEstado: boolean) => {
    await toggleEmpleadoEstado(cedula, !currentEstado);
    setEmpleados((prev) =>
      prev.map((e) => (e.cedula === cedula ? { ...e, activo: !currentEstado } : e))
    );
  };

  // Filtered by search
  const filteredList = empleados.filter((e) => {
    const matchesSearch =
      e.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.cedula.toString().includes(searchTerm);
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Directorio y Registro de Colaboradores</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Asignación organizativa, enrolamiento facial y registro de huellas dactilares.
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
          <UserPlus size={16} /> Registrar Colaborador
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

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(8, 12, 22, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <select
          value={filterSede || ''}
          onChange={(e) => setFilterSede(e.target.value ? Number(e.target.value) : undefined)}
          style={{
            padding: '10px 14px',
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
          value={filterDepto || ''}
          onChange={(e) => setFilterDepto(e.target.value ? Number(e.target.value) : undefined)}
          style={{
            padding: '10px 14px',
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

      {/* Employees Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px' }}>CÉDULA</th>
              <th style={{ padding: '12px' }}>COLABORADOR</th>
              <th style={{ padding: '12px' }}>SEDE</th>
              <th style={{ padding: '12px' }}>DEPARTAMENTO</th>
              <th style={{ padding: '12px' }}>CARGO</th>
              <th style={{ padding: '12px' }}>TURNO ASIGNADO</th>
              <th style={{ padding: '12px' }}>BIOMETRÍA</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  Cargando directorio de colaboradores...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron colaboradores coincidentes con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredList.map((e) => (
                <tr key={e.cedula} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="mono" style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {e.cedula}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{e.nombre_completo}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.email || 'Sin correo registrado'}</div>
                  </td>
                <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={13} color="var(--accent-blue)" /> {e.nombre_sede || 'No asignada'}
                  </span>
                </td>
                <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                  {e.nombre_departamento || e.departamento}
                </td>
                <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={13} color="var(--accent-cyan)" /> {e.nombre_cargo || 'Sin cargo'}
                  </span>
                </td>
                <td style={{ padding: '12px', color: 'var(--accent-emerald)', fontSize: '0.8rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {e.nombre_turno || 'Turno Regular'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      title={e.foto_referencial ? 'Foto referencial enrolada' : 'Sin foto'}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: e.foto_referencial ? 'rgba(0, 245, 160, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: e.foto_referencial ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        fontSize: '0.7rem',
                      }}
                    >
                      <Camera size={12} />
                    </span>
                    <span
                      title={e.template_huella ? 'Huella enrolada' : 'Sin huella'}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: e.template_huella ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: e.template_huella ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        fontSize: '0.7rem',
                      }}
                    >
                      <Fingerprint size={12} />
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggleEstado(e.cedula, e.activo)}
                    title={e.activo ? 'Desactivar colaborador' : 'Activar colaborador'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: e.activo ? 'rgba(0, 245, 160, 0.15)' : 'rgba(255, 75, 92, 0.15)',
                      color: e.activo ? 'var(--accent-emerald)' : 'var(--accent-coral)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <Power size={12} /> {e.activo ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                </td>
              </tr>
            ))
          )}
          </tbody>
        </table>
      </div>

      {/* Registration Modal with Biometrics and Dynamic Selectors */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 6, 12, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '20px',
          }}
          onClick={() => {
            setShowModal(false);
            setUseCamera(false);
          }}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Nuevo Colaborador</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setUseCamera(false);
                }}
                style={{ background: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Personal Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    CÉDULA / ID *
                  </label>
                  <input
                    type="number"
                    required
                    value={formCedula}
                    onChange={(e) => setFormCedula(e.target.value)}
                    placeholder="26123456"
                    className="mono"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    NOMBRE COMPLETO *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Alejandro José Morales"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    CORREO ELECTRÓNICO
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="amorales@rapture.corp"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    TELÉFONO DE CONTACTO
                  </label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="+58 412 9988776"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Dynamic Organizational Assignment */}
              <div style={{ padding: '16px', background: 'rgba(8, 12, 22, 0.7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'block', marginBottom: '12px' }}>
                  ASIGNACIÓN EN LA ESTRUCTURA ORGANIZATIVA
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {/* Sede Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>SEDE *</label>
                    <select
                      required
                      value={formSedeId || ''}
                      onChange={(e) => {
                        const sid = e.target.value ? Number(e.target.value) : undefined;
                        setFormSedeId(sid);
                        setFormDeptoId(undefined);
                        setFormCargoId(undefined);
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                    >
                      <option value="">Seleccione Sede...</option>
                      {sedes.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Depto Selector (Filtered by Sede) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>DEPARTAMENTO *</label>
                    <select
                      required
                      disabled={!formSedeId}
                      value={formDeptoId || ''}
                      onChange={(e) => {
                        const did = e.target.value ? Number(e.target.value) : undefined;
                        setFormDeptoId(did);
                        setFormCargoId(undefined);
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                    >
                      <option value="">{formSedeId ? 'Seleccione Departamento...' : 'Seleccione primero una Sede'}</option>
                      {formDeptosDisponibles.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Cargo Selector (Filtered by Depto) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>CARGO / ROL</label>
                    <select
                      disabled={!formDeptoId}
                      value={formCargoId || ''}
                      onChange={(e) => setFormCargoId(e.target.value ? Number(e.target.value) : undefined)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                    >
                      <option value="">{formDeptoId ? 'Seleccione Cargo...' : 'Seleccione primero Departamento'}</option>
                      {formCargosDisponibles.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Turno Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>TURNO LABORAL</label>
                    <select
                      value={formTurnoId || ''}
                      onChange={(e) => setFormTurnoId(e.target.value ? Number(e.target.value) : undefined)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0e1526', border: '1px solid var(--border-subtle)', color: '#fff' }}
                    >
                      <option value="">Seleccione Turno...</option>
                      {turnos.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre} ({t.hora_entrada} - {t.hora_salida})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Biometrics Enrollment (Face & Fingerprint) */}
              <div style={{ padding: '16px', background: 'rgba(8, 12, 22, 0.7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-emerald)', display: 'block', marginBottom: '12px' }}>
                  ENROLAMIENTO BIOMÉTRICO
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Photo Enrollment */}
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Foto Referencial (Reconocimiento Facial)
                    </span>
                    {formFotoB64 ? (
                      <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--accent-emerald)' }}>
                        <img src={formFotoB64} alt="Foto referencial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setFormFotoB64(null)}
                          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ×
                        </button>
                      </div>
                    ) : useCamera ? (
                      <div>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '160px', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--accent-cyan)' }} />
                        <button
                          type="button"
                          onClick={takeSnapshot}
                          style={{ display: 'block', marginTop: '6px', padding: '6px 12px', background: 'var(--accent-cyan)', color: '#070a13', fontWeight: 700, borderRadius: '4px', fontSize: '0.75rem' }}
                        >
                          Capturar Foto
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <Camera size={14} /> Abrir Cámara para Foto
                      </button>
                    )}
                  </div>

                  {/* Fingerprint Enrollment */}
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Template Dactilar (Lector de Huella)
                    </span>
                    {formHuella ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '6px', color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>
                        <Fingerprint size={18} />
                        <div>
                          <strong>Huella Enrolada</strong>
                          <div className="mono" style={{ fontSize: '0.65rem', opacity: 0.8 }}>ISO-19794-OK</div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const randId = Math.random().toString(36).substring(2, 12).toUpperCase();
                          setFormHuella(`ISO_FP_TEMPLATE_${randId}`);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--accent-emerald)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <Fingerprint size={14} /> Simular / Capturar Huella
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setUseCamera(false);
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                    color: '#070a13',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Guardar y Enrolar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
