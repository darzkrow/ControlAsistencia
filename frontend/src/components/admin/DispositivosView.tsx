import React, { useState, useEffect } from 'react';
import {
  fetchDispositivos,
  createDispositivo,
  updateDispositivo,
  deleteDispositivo,
  pingDispositivo,
  sincronizarDispositivo,
  enrolarCapturaDispositivo,
  fetchSedes,
  fetchEmpleados,
  type DispositivoBiometrico,
  type CreateDispositivoRequest,
  type Sede,
  type EmpleadoDetallado,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Cpu,
  Plus,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Fingerprint,
  Trash2,
  Edit2,
  Wifi,
  Radio,
} from 'lucide-react';
import { formatTimeTo12h } from '../../utils/dateUtils';

export const DispositivosView: React.FC = () => {
  const { hasPermission } = useAuth();
  const [dispositivos, setDispositivos] = useState<DispositivoBiometrico[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoDetallado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [marcaFiltro, setMarcaFiltro] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modales
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<DispositivoBiometrico | null>(null);
  const [showEnrolModal, setShowEnrolModal] = useState<boolean>(false);
  const [selectedDeviceForEnrol, setSelectedDeviceForEnrol] = useState<DispositivoBiometrico | null>(null);

  // Estados de acciones por dispositivo
  const [pingingId, setPingingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState<boolean>(false);
  const [selectedCedula, setSelectedCedula] = useState<number | ''>('');
  const [forzarSimulacionEnrol, setForzarSimulacionEnrol] = useState<boolean>(false);

  // Formulario nuevo/editar dispositivo
  const [formData, setFormData] = useState<CreateDispositivoRequest>({
    nombre: '',
    marca: 'ZKTeco',
    modelo: '',
    direccion_ip: '',
    puerto: 4370,
    protocolo: 'ZK_TCP',
    clave_comunicacion: '0',
    numero_serie: '',
    sede_id: null,
    tipo_acceso: 'ambos',
  });

  const canCreate = hasPermission('dispositivos', 'crear');
  const canUpdate = hasPermission('dispositivos', 'actualizar');
  const canDelete = hasPermission('dispositivos', 'eliminar');

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [devs, seds, emps] = await Promise.all([
        fetchDispositivos(),
        fetchSedes(),
        fetchEmpleados(),
      ]);
      setDispositivos(devs);
      setSedes(seds);
      setEmpleados(emps);
    } catch (err: any) {
      setError(err.message || 'Error al cargar terminales biometricos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      nombre: '',
      marca: 'ZKTeco',
      modelo: 'SilkBio-101TC',
      direccion_ip: '192.168.1.200',
      puerto: 4370,
      protocolo: 'ZK_TCP',
      clave_comunicacion: '0',
      numero_serie: `DEV-${Date.now().toString().slice(-6)}`,
      sede_id: sedes.length > 0 ? sedes[0].id : null,
      tipo_acceso: 'ambos',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (dev: DispositivoBiometrico) => {
    setEditingDevice(dev);
    setFormData({
      nombre: dev.nombre,
      marca: dev.marca,
      modelo: dev.modelo,
      direccion_ip: dev.direccion_ip,
      puerto: dev.puerto,
      protocolo: dev.protocolo,
      clave_comunicacion: dev.clave_comunicacion || '0',
      numero_serie: dev.numero_serie || '',
      sede_id: dev.sede_id || null,
      tipo_acceso: dev.tipo_acceso,
    });
    setShowModal(true);
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        await updateDispositivo(editingDevice.id, formData);
        setSuccessMsg(`Dispositivo '${formData.nombre}' actualizado correctamente.`);
      } else {
        await createDispositivo(formData);
        setSuccessMsg(`Dispositivo '${formData.nombre}' registrado con exito.`);
      }
      setShowModal(false);
      cargarDatos();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el dispositivo');
    }
  };

  const handleDeleteDevice = async (id: number, nombre: string) => {
    if (!window.confirm(`Confirma que desea eliminar el dispositivo biometrico '${nombre}'?`)) {
      return;
    }
    try {
      await deleteDispositivo(id);
      setSuccessMsg(`Dispositivo '${nombre}' eliminado del sistema.`);
      cargarDatos();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar dispositivo');
    }
  };

  const handlePing = async (id: number) => {
    try {
      setPingingId(id);
      setError(null);
      const res = await pingDispositivo(id);
      if (res.online) {
        setSuccessMsg(`Dispositivo en linea: Latencia ${res.latencia_ms} ms. ${res.mensaje}`);
      } else {
        setError(`Dispositivo sin respuesta: ${res.mensaje}`);
      }
      // Actualizar estado local
      setDispositivos((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                estado_conexion: res.online ? 'en_linea' : 'desconectado',
                latencia_ms: res.latencia_ms,
                ultimo_ping: new Date().toISOString(),
              }
            : d
        )
      );
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Fallo de comunicacion en prueba ping');
    } finally {
      setPingingId(null);
    }
  };

  const handleSync = async (id: number) => {
    try {
      setSyncingId(id);
      setError(null);
      const res = await sincronizarDispositivo(id);
      setSuccessMsg(`Sincronizacion completada: ${res.marcaciones_ingeridas} marcaciones ingeridas al motor.`);
      cargarDatos();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error en sincronizacion con terminal');
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenEnrolModal = (dev: DispositivoBiometrico) => {
    setSelectedDeviceForEnrol(dev);
    setSelectedCedula(empleados.length > 0 ? empleados[0].cedula : '');
    setForzarSimulacionEnrol(false);
    setShowEnrolModal(true);
  };

  const handleExecuteEnrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceForEnrol || !selectedCedula) return;

    try {
      setEnrolling(true);
      setError(null);
      const res = await enrolarCapturaDispositivo(
        selectedDeviceForEnrol.id,
        Number(selectedCedula),
        forzarSimulacionEnrol
      );
      if (res.exito) {
        setSuccessMsg(
          `Enrolamiento exitoso para cedula ${selectedCedula}. Plantilla biometrica guardada en base de datos.`
        );
        setShowEnrolModal(false);
        cargarDatos();
      } else {
        setError(res.mensaje || 'Fallo al capturar huella desde el terminal');
      }
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error durante la captura biometrica remota');
    } finally {
      setEnrolling(false);
    }
  };

  // Filtrado
  const dispositivosFiltrados = dispositivos.filter((d) => {
    const cumpleMarca = marcaFiltro === 'todas' || d.marca.toLowerCase() === marcaFiltro.toLowerCase();
    const cumpleBusqueda =
      d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.direccion_ip.includes(busqueda) ||
      (d.modelo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (d.nombre_sede || '').toLowerCase().includes(busqueda.toLowerCase());
    return cumpleMarca && cumpleBusqueda;
  });

  const totalEnLinea = dispositivos.filter((d) => d.estado_conexion === 'en_linea').length;
  const totalDesconectados = dispositivos.filter((d) => d.estado_conexion !== 'en_linea').length;
  const totalMarcaciones = dispositivos.reduce((acc, d) => acc + (d.total_marcaciones_sincronizadas || 0), 0);

  const getBrandBadge = (marca: string) => {
    const m = (marca || '').toUpperCase();
    if (m.includes('ZK')) {
      return { bg: 'rgba(0, 242, 254, 0.15)', border: 'rgba(0, 242, 254, 0.4)', text: 'var(--accent-cyan)' };
    }
    if (m.includes('HIK')) {
      return { bg: 'rgba(255, 99, 132, 0.15)', border: 'rgba(255, 99, 132, 0.4)', text: '#ff6384' };
    }
    if (m.includes('DAHUA')) {
      return { bg: 'rgba(153, 102, 255, 0.15)', border: 'rgba(153, 102, 255, 0.4)', text: '#b388ff' };
    }
    return { bg: 'rgba(255, 206, 86, 0.15)', border: 'rgba(255, 206, 86, 0.4)', text: '#ffd166' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header y Acciones */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(0, 242, 254, 0.12)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Cpu size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.02em', margin: 0 }}>
                Control de Acceso y Captahuellas IP
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '3px 0 0 0' }}>
                Integracion de terminales biometricos de red (ZKTeco, Hikvision, Dahua) con IP fija y enrolamiento remoto.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={cargarDatos}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refrescar
          </button>

          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--grad-primary)',
                border: 'none',
                color: '#080d1a',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0, 242, 254, 0.25)',
              }}
            >
              <Plus size={16} /> Nuevo Dispositivo IP
            </button>
          )}
        </div>
      </div>

      {/* Mensajes de Alerta */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <XCircle size={18} /> {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {/* Tarjetas de Metricas Resumen */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(0, 242, 254, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            <Radio size={20} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
              DISPOSITIVOS TOTALES
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px' }}>{dispositivos.length}</div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <Wifi size={20} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
              EN LINEA (ONLINE IP)
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px', color: '#34d399' }}>
              {totalEnLinea}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
              DESCONECTADOS
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px', color: '#f87171' }}>
              {totalDesconectados}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
            }}
          >
            <Fingerprint size={20} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
              MARCAJES SINCRONIZADOS
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px', color: '#c084fc' }}>
              {totalMarcaciones}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Busqueda */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'var(--bg-surface)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, IP, modelo o sede..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Marca:</span>
          {['todas', 'ZKTeco', 'Hikvision', 'Dahua'].map((m) => (
            <button
              key={m}
              onClick={() => setMarcaFiltro(m)}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.76rem',
                fontWeight: 600,
                background: marcaFiltro === m ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: marcaFiltro === m ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: marcaFiltro === m ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Dispositivos Biometricos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Cargando terminales y verificando estados IP...
        </div>
      ) : dispositivosFiltrados.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <Cpu size={36} style={{ opacity: 0.4, marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
            No se encontraron terminales biometricos
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>
            Registre una nueva terminal de acceso por IP fija mediante el boton 'Nuevo Dispositivo IP'.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '18px',
          }}
        >
          {dispositivosFiltrados.map((dev) => {
            const badge = getBrandBadge(dev.marca);
            const isOnline = dev.estado_conexion === 'en_linea';
            const isPinging = pingingId === dev.id;
            const isSyncing = syncingId === dev.id;

            return (
              <div
                key={dev.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: isOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                  boxShadow: isOnline ? '0 4px 20px rgba(16, 185, 129, 0.05)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Cabecera de la Tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          textTransform: 'uppercase',
                        }}
                      >
                        {dev.marca}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{dev.protocolo}</span>
                    </div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0 }}>{dev.nombre}</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {dev.modelo || 'Modelo Estandar'} • SN: {dev.numero_serie || 'N/A'}
                    </div>
                  </div>

                  {/* Estado de Conexion Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isOnline ? '#34d399' : '#f87171',
                      border: isOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isOnline ? '#34d399' : '#f87171',
                      }}
                    />
                    {isOnline ? `EN LINEA (${dev.latencia_ms || 10} ms)` : 'DESCONECTADO'}
                  </div>
                </div>

                {/* Detalles de Red y Sede */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Direccion IP Fija:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                      {dev.direccion_ip}:{dev.puerto}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ubicacion / Sede:</span>
                    <span style={{ fontWeight: 600 }}>{dev.nombre_sede || 'Global / Sin sede'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Control de Flujo:</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{dev.tipo_acceso}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ultimo Diagnostico:</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {dev.ultimo_ping ? formatTimeTo12h(dev.ultimo_ping, true) : 'Pendiente'}
                    </span>
                  </div>
                </div>

                {/* Botones de Accion */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
                  {/* Ping IP */}
                  <button
                    onClick={() => handlePing(dev.id)}
                    disabled={isPinging}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 242, 254, 0.08)',
                      border: '1px solid rgba(0, 242, 254, 0.25)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Realizar prueba de socket TCP a la IP"
                  >
                    <Activity size={13} className={isPinging ? 'animate-spin' : ''} />
                    {isPinging ? 'Probando...' : 'Probar IP'}
                  </button>

                  {/* Sincronizar Marcajes */}
                  <button
                    onClick={() => handleSync(dev.id)}
                    disabled={isSyncing}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      color: '#c084fc',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Descargar eventos acumulados en el buffer del terminal"
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Leyendo...' : 'Sincronizar'}
                  </button>

                  {/* Usar como Captahuellas de Enrolamiento */}
                  <button
                    onClick={() => handleOpenEnrolModal(dev)}
                    style={{
                      flex: 1.2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Activar sensor para capturar huella y asociarla a un colaborador"
                  >
                    <Fingerprint size={13} /> Enrolar
                  </button>
                </div>

                {/* Acciones de Administracion (Editar/Eliminar) */}
                {(canUpdate || canDelete) && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenEditModal(dev)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.74rem',
                        }}
                      >
                        <Edit2 size={13} /> Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteDevice(dev.id, dev.nombre)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.74rem',
                        }}
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar/Editar Dispositivo */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                {editingDevice ? 'Editar Dispositivo Biometrico' : 'Registrar Nuevo Terminal de Acceso IP'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Nombre Descriptivo del Terminal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Torniquete Principal Planta Central"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Marca del Fabricante *
                  </label>
                  <select
                    value={formData.marca}
                    onChange={(e) => {
                      const m = e.target.value;
                      let defaultPort = 4370;
                      let defaultProto = 'ZK_TCP';
                      if (m === 'Hikvision') {
                        defaultPort = 8000;
                        defaultProto = 'HIKVISION_ISAPI';
                      } else if (m === 'Dahua') {
                        defaultPort = 80;
                        defaultProto = 'DAHUA_CGI';
                      }
                      setFormData({
                        ...formData,
                        marca: m,
                        puerto: defaultPort,
                        protocolo: defaultProto,
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="ZKTeco">ZKTeco</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Dahua">Dahua</option>
                    <option value="Anviz">Anviz</option>
                    <option value="Suprema">Suprema</option>
                    <option value="Generico">Generico / HTTP Webhook</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Modelo del Hardware
                  </label>
                  <input
                    type="text"
                    placeholder="ej. SilkBio-101TC / DS-K1T804"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Direccion IP Fija en Red Local *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.201"
                    value={formData.direccion_ip}
                    onChange={(e) => setFormData({ ...formData, direccion_ip: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Puerto *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="4370"
                    value={formData.puerto}
                    onChange={(e) => setFormData({ ...formData, puerto: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Clave de Comunicacion (CommKey)
                  </label>
                  <input
                    type="text"
                    placeholder="0 (o password ISAPI)"
                    value={formData.clave_comunicacion}
                    onChange={(e) => setFormData({ ...formData, clave_comunicacion: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Numero de Serie
                  </label>
                  <input
                    type="text"
                    placeholder="ZK-SB101-9921"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Sede Asignada
                  </label>
                  <select
                    value={formData.sede_id || ''}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value ? Number(e.target.value) : null })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="">Sin Sede (Global)</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Tipo de Acceso
                  </label>
                  <select
                    value={formData.tipo_acceso}
                    onChange={(e) => setFormData({ ...formData, tipo_acceso: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="ambos">Bidireccional (Entrada y Salida)</option>
                    <option value="entrada">Solo Entrada</option>
                    <option value="salida">Solo Salida</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--grad-primary)',
                    border: 'none',
                    color: '#080d1a',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  {editingDevice ? 'Guardar Cambios' : 'Registrar Dispositivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Usar Dispositivo como Captahuellas de Enrolamiento */}
      {showEnrolModal && selectedDeviceForEnrol && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Fingerprint size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Enrolamiento Biometrico Remoto</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Capturar huella dactilar mediante {selectedDeviceForEnrol.nombre} ({selectedDeviceForEnrol.direccion_ip})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowEnrolModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteEnrol} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Seleccione el Colaborador a Enrolar:
                </label>
                <select
                  required
                  value={selectedCedula}
                  onChange={(e) => setSelectedCedula(e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                  }}
                >
                  {empleados.map((emp) => (
                    <option key={emp.cedula} value={emp.cedula}>
                      {emp.cedula} - {emp.nombre_completo} ({emp.departamento}) {emp.template_huella ? '[Tiene Huella]' : '[Sin Huella]'}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  background: 'rgba(0, 242, 254, 0.04)',
                  border: '1px solid rgba(0, 242, 254, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                <strong>Procedimiento de Captura:</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>El servidor enviara la instruccion de activacion al sensor de la terminal IP.</li>
                  <li>El colaborador debe colocar su dedo en el prisma del lector 3 veces seguidas.</li>
                  <li>La plantilla ISO/IEC 19794-2 se extraera y se vinculara a la ficha del colaborador.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="forzarSim"
                  checked={forzarSimulacionEnrol}
                  onChange={(e) => setForzarSimulacionEnrol(e.target.checked)}
                />
                <label htmlFor="forzarSim" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Modo Laboratorio / Validacion (genera plantilla de prueba si el hardware fisico esta apagado)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEnrolModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--grad-primary)',
                    border: 'none',
                    color: '#080d1a',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  <Fingerprint size={16} className={enrolling ? 'animate-spin' : ''} />
                  {enrolling ? 'Activando Sensor...' : 'Iniciar Captura Biometrica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
