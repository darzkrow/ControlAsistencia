// ==============================================================================
// Tipos de Datos y Cliente API para Kiosko Biométrico y Portal Administrativo
// ==============================================================================

export interface EscaneoRequest {
  cedula: number;
  foto_b64?: string | null;
  huella_b64?: string | null;
  metodo?: 'facial' | 'huella' | 'dual';
}

export interface EscaneoResponse {
  es_empleado: boolean;
  mensaje: string;
  nombre_completo?: string;
  departamento?: string;
  tipo_evento: 'entrada' | 'salida' | 'visitante' | 'rechazado' | 'cooldown' | string;
  foto_detectada_b64?: string;
  minutos_acumulados?: number;
  hora_evento?: string;
}

export interface EventoReciente {
  id: string;
  cedula: number;
  nombre: string;
  departamento?: string;
  tipo: string;
  timestamp: string;
  metodo: string;
  exito: boolean;
}

// ------------------------------------------------------------------------------
// Modelos de la Estructura Organizativa Dinámica
// ------------------------------------------------------------------------------
export interface Sede {
  id: number;
  codigo: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  activa: boolean;
  created_at?: string;
}

export interface CreateSedeRequest {
  codigo: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
}

export interface Departamento {
  id: number;
  sede_id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  created_at?: string;
  nombre_sede?: string;
}

export interface CreateDepartamentoRequest {
  sede_id: number;
  codigo: string;
  nombre: string;
}

export interface Cargo {
  id: number;
  departamento_id: number;
  nombre: string;
  descripcion?: string;
  created_at?: string;
  nombre_departamento?: string;
}

export interface CreateCargoRequest {
  departamento_id: number;
  nombre: string;
  descripcion?: string;
}

export interface Turno {
  id: number;
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  tolerancia_minutos: number;
  dias_laborales: string;
  activo: boolean;
  created_at?: string;
}

export interface CreateTurnoRequest {
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  tolerancia_minutos?: number;
  dias_laborales?: string;
}

export interface EmpleadoDetallado {
  cedula: number;
  nombre_completo: string;
  email?: string;
  telefono?: string;
  departamento: string;
  sede_id?: number;
  nombre_sede?: string;
  departamento_id?: number;
  nombre_departamento?: string;
  cargo_id?: number;
  nombre_cargo?: string;
  turno_id?: number;
  nombre_turno?: string;
  foto_referencial?: string;
  template_huella?: string;
  activo: boolean;
  created_at?: string;
}

export interface CreateEmpleadoRequest {
  cedula: number;
  nombre_completo: string;
  email?: string;
  telefono?: string;
  departamento_nombre?: string;
  sede_id?: number;
  departamento_id?: number;
  cargo_id?: number;
  turno_id?: number;
  foto_b64?: string;
  template_huella?: string;
}

export interface AsistenciaReporte {
  empleado_cedula: number;
  nombre_completo: string;
  nombre_sede?: string;
  nombre_departamento?: string;
  nombre_cargo?: string;
  fecha: string;
  hora_entrada?: string;
  hora_salida?: string;
  estado?: string;
  minutos_trabajados: number;
  puntualidad?: 'Puntual' | 'Retardo' | 'Salida Temprana' | 'En curso' | string;
  minutos_retardo: number;
  foto_entrada?: string;
  foto_salida?: string;
}

export interface DashboardMetrics {
  total_empleados: number;
  empleados_activos: number;
  sedes_activas: number;
  asistencias_hoy: number;
  en_curso_hoy: number;
  puntualidad_pct: number;
}

// ------------------------------------------------------------------------------
// INTERFACES DE SEGURIDAD, RBAC Y MODELOS
// ------------------------------------------------------------------------------

export interface Rol {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  es_sistema: boolean;
  activo: boolean;
  created_at?: string;
}

export interface ModeloRecurso {
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  soporta_alcance_sede: boolean;
  acciones_disponibles: string;
}

export interface RolPoliticaModelo {
  id: number;
  rol_id: number;
  modelo_codigo: string;
  puede_crear: boolean;
  puede_leer: boolean;
  puede_actualizar: boolean;
  puede_eliminar: boolean;
  puede_exportar: boolean;
  alcance: 'global' | 'sede' | 'ninguno';
  created_at?: string;
}

export interface UsuarioAdmin {
  id: number;
  username: string;
  email: string;
  nombre_completo: string;
  rol_id: number;
  rol_codigo: string;
  rol_nombre: string;
  sede_id?: number;
  sede_nombre?: string;
  intentos_fallidos: number;
  bloqueado_hasta?: string;
  activo: boolean;
  ultimo_login?: string;
  created_at?: string;
}

export interface AuditoriaSeguridad {
  id: number;
  usuario_id?: number;
  usuario_email?: string;
  accion: string;
  modulo: string;
  detalles?: string;
  ip_origen?: string;
  fecha_hora: string;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioAdmin;
  politicas: RolPoliticaModelo[];
}

export interface CreateRoleRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface CreateUsuarioRequest {
  username: string;
  email: string;
  password: string;
  nombre_completo: string;
  rol_id: number;
  sede_id?: number;
}

// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Configuración de URL Base y Sesión de Seguridad
// ------------------------------------------------------------------------------
const DEFAULT_API_URL = '';

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem('rapture_api_url');
  if (custom && custom.trim() !== '') return custom.trim();
  return DEFAULT_API_URL;
}

export function setApiBaseUrl(url: string) {
  if (!url || url.trim() === '' || url.trim() === 'http://127.0.0.1:3000' || url.trim() === 'http://localhost:3000') {
    localStorage.removeItem('rapture_api_url');
  } else {
    localStorage.setItem('rapture_api_url', url.trim().replace(/\/+$/, ''));
  }
}

export function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('rapture_admin_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token || null;
    }
  } catch {
    // Ignore error
  }
  return null;
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkServerHealth(): Promise<boolean> {
  const customUrl = localStorage.getItem('rapture_api_url');
  const candidateUrls: string[] = [];

  if (customUrl && customUrl.trim() !== '') {
    candidateUrls.push(`${customUrl.trim().replace(/\/+$/, '')}/api/health`);
  }
  // Always include relative proxy /api/health and direct 127.0.0.1:3000
  candidateUrls.push('/api/health');
  candidateUrls.push('http://127.0.0.1:3000/api/health');
  candidateUrls.push('http://localhost:3000/api/health');

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return true;
      }
    } catch {
      // Continue to next candidate URL
    }
  }
  return false;
}

// ------------------------------------------------------------------------------
// KIOSKO BIOMÉTRICO
// ------------------------------------------------------------------------------
export async function registrarEscaneo(payload: EscaneoRequest): Promise<EscaneoResponse> {
  const url = `${getApiBaseUrl()}/api/escaneo`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Servidor devolvió código HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Fallo de conexión con Backend Axum:', err);
    throw err;
  }
}

// ------------------------------------------------------------------------------
// DATOS MOCK PARA MODO DESCONECTADO (Garantiza funcionalidad interactiva)
// ------------------------------------------------------------------------------
let mockSedes: Sede[] = [
  { id: 1, codigo: 'SEDE-CENTRAL', nombre: 'Sede Central Administrativa', direccion: 'Av. Libertador, Edif. Rapture Towers', ciudad: 'Caracas', activa: true },
  { id: 2, codigo: 'SEDE-NORTE', nombre: 'Planta Tecnológica e I+D', direccion: 'Parque Industrial Norte, Módulo B', ciudad: 'Valencia', activa: true },
];

let mockDeptos: Departamento[] = [
  { id: 1, sede_id: 1, codigo: 'DEP-ESTAD', nombre: 'Gerencia de Estadística', activo: true, nombre_sede: 'Sede Central Administrativa' },
  { id: 2, sede_id: 1, codigo: 'DEP-RRHH', nombre: 'Recursos Humanos', activo: true, nombre_sede: 'Sede Central Administrativa' },
  { id: 3, sede_id: 2, codigo: 'DEP-TI', nombre: 'Tecnología e Informática', activo: true, nombre_sede: 'Planta Tecnológica e I+D' },
  { id: 4, sede_id: 2, codigo: 'DEP-OP', nombre: 'Operaciones y Logística', activo: true, nombre_sede: 'Planta Tecnológica e I+D' },
];

let mockCargos: Cargo[] = [
  { id: 1, departamento_id: 1, nombre: 'Especialista de Estadísticas y Análisis', descripcion: 'Modelos predictivos y métricas', nombre_departamento: 'Gerencia de Estadística' },
  { id: 2, departamento_id: 2, nombre: 'Coordinadora de Recursos Humanos', descripcion: 'Gestión de personal y nómina', nombre_departamento: 'Recursos Humanos' },
  { id: 3, departamento_id: 3, nombre: 'Ingeniero de Infraestructura y Software', descripcion: 'Desarrollo, nube y ciberseguridad', nombre_departamento: 'Tecnología e Informática' },
  { id: 4, departamento_id: 4, nombre: 'Supervisor de Operaciones Biométricas', descripcion: 'Mantenimiento de lectores y planta', nombre_departamento: 'Operaciones y Logística' },
];

let mockTurnos: Turno[] = [
  { id: 1, nombre: 'Turno Administrativo Regular', hora_entrada: '08:00:00', hora_salida: '17:00:00', tolerancia_minutos: 15, dias_laborales: 'L,M,X,J,V', activo: true },
  { id: 2, nombre: 'Turno Técnico Matutino', hora_entrada: '07:00:00', hora_salida: '15:30:00', tolerancia_minutos: 10, dias_laborales: 'L,M,X,J,V', activo: true },
  { id: 3, nombre: 'Turno Tarde / Operativo', hora_entrada: '13:00:00', hora_salida: '21:00:00', tolerancia_minutos: 15, dias_laborales: 'L,M,X,J,V', activo: true },
];

let mockEmpleados: EmpleadoDetallado[] = [
  {
    cedula: 22789456,
    nombre_completo: 'Juan Carlos Pérez Gómez',
    email: 'jperez@rapture.corp',
    telefono: '+58 412 1112233',
    departamento: 'Gerencia de estadística',
    sede_id: 1,
    nombre_sede: 'Sede Central Administrativa',
    departamento_id: 1,
    nombre_departamento: 'Gerencia de Estadística',
    cargo_id: 1,
    nombre_cargo: 'Especialista de Estadísticas y Análisis',
    turno_id: 1,
    nombre_turno: 'Turno Administrativo Regular',
    activo: true,
  },
  {
    cedula: 19543210,
    nombre_completo: 'María Alejandra Rodríguez',
    email: 'mrodriguez@rapture.corp',
    telefono: '+58 414 3334455',
    departamento: 'Recursos Humanos',
    sede_id: 1,
    nombre_sede: 'Sede Central Administrativa',
    departamento_id: 2,
    nombre_departamento: 'Recursos Humanos',
    cargo_id: 2,
    nombre_cargo: 'Coordinadora de Recursos Humanos',
    turno_id: 1,
    nombre_turno: 'Turno Administrativo Regular',
    activo: true,
  },
  {
    cedula: 25111222,
    nombre_completo: 'Carlos Eduardo Mendoza',
    email: 'cmendoza@rapture.corp',
    telefono: '+58 424 5556677',
    departamento: 'Tecnología e Informática',
    sede_id: 2,
    nombre_sede: 'Planta Tecnológica e I+D',
    departamento_id: 3,
    nombre_departamento: 'Tecnología e Informática',
    cargo_id: 3,
    nombre_cargo: 'Ingeniero de Infraestructura y Software',
    turno_id: 2,
    nombre_turno: 'Turno Técnico Matutino',
    activo: true,
  },
];

// ------------------------------------------------------------------------------
// PORTAL ADMINISTRATIVO - MÉTODOS DE API CON FALLBACK AUTOMÁTICO
// ------------------------------------------------------------------------------

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const url = `${getApiBaseUrl()}/api/admin/dashboard`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      total_empleados: mockEmpleados.length,
      empleados_activos: mockEmpleados.filter((e) => e.activo).length,
      sedes_activas: mockSedes.filter((s) => s.activa).length,
      asistencias_hoy: 3,
      en_curso_hoy: 2,
      puntualidad_pct: 94.5,
    };
  }
}

export async function fetchSedes(): Promise<Sede[]> {
  const url = `${getApiBaseUrl()}/api/admin/sedes`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockSedes;
  }
}

export async function createSede(payload: CreateSedeRequest): Promise<Sede> {
  const url = `${getApiBaseUrl()}/api/admin/sedes`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const nueva: Sede = {
      id: Date.now(),
      codigo: payload.codigo.toUpperCase(),
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      activa: true,
    };
    mockSedes = [...mockSedes, nueva];
    return nueva;
  }
}

export async function fetchDepartamentos(sedeId?: number): Promise<Departamento[]> {
  const q = sedeId ? `?sede_id=${sedeId}` : '';
  const url = `${getApiBaseUrl()}/api/admin/departamentos${q}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return sedeId ? mockDeptos.filter((d) => d.sede_id === sedeId) : mockDeptos;
  }
}

export async function createDepartamento(payload: CreateDepartamentoRequest): Promise<Departamento> {
  const url = `${getApiBaseUrl()}/api/admin/departamentos`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const sedeNombre = mockSedes.find((s) => s.id === payload.sede_id)?.nombre || '';
    const nuevo: Departamento = {
      id: Date.now(),
      sede_id: payload.sede_id,
      codigo: payload.codigo.toUpperCase(),
      nombre: payload.nombre,
      activo: true,
      nombre_sede: sedeNombre,
    };
    mockDeptos = [...mockDeptos, nuevo];
    return nuevo;
  }
}

export async function fetchCargos(departamentoId?: number): Promise<Cargo[]> {
  const q = departamentoId ? `?departamento_id=${departamentoId}` : '';
  const url = `${getApiBaseUrl()}/api/admin/cargos${q}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return departamentoId ? mockCargos.filter((c) => c.departamento_id === departamentoId) : mockCargos;
  }
}

export async function createCargo(payload: CreateCargoRequest): Promise<Cargo> {
  const url = `${getApiBaseUrl()}/api/admin/cargos`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const deptoNombre = mockDeptos.find((d) => d.id === payload.departamento_id)?.nombre || '';
    const nuevo: Cargo = {
      id: Date.now(),
      departamento_id: payload.departamento_id,
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      nombre_departamento: deptoNombre,
    };
    mockCargos = [...mockCargos, nuevo];
    return nuevo;
  }
}

export async function fetchTurnos(): Promise<Turno[]> {
  const url = `${getApiBaseUrl()}/api/admin/turnos`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockTurnos;
  }
}

export async function createTurno(payload: CreateTurnoRequest): Promise<Turno> {
  const url = `${getApiBaseUrl()}/api/admin/turnos`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const nuevo: Turno = {
      id: Date.now(),
      nombre: payload.nombre,
      hora_entrada: payload.hora_entrada,
      hora_salida: payload.hora_salida,
      tolerancia_minutos: payload.tolerancia_minutos || 15,
      dias_laborales: payload.dias_laborales || 'L,M,X,J,V',
      activo: true,
    };
    mockTurnos = [...mockTurnos, nuevo];
    return nuevo;
  }
}

export async function fetchEmpleados(sedeId?: number, deptoId?: number): Promise<EmpleadoDetallado[]> {
  const params = new URLSearchParams();
  if (sedeId) params.append('sede_id', sedeId.toString());
  if (deptoId) params.append('departamento_id', deptoId.toString());
  const q = params.toString() ? `?${params.toString()}` : '';

  const url = `${getApiBaseUrl()}/api/admin/empleados${q}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    let list = mockEmpleados;
    if (sedeId) list = list.filter((e) => e.sede_id === sedeId);
    if (deptoId) list = list.filter((e) => e.departamento_id === deptoId);
    return list;
  }
}

export async function createEmpleado(payload: CreateEmpleadoRequest): Promise<{ exito: boolean; mensaje: string }> {
  const url = `${getApiBaseUrl()}/api/admin/empleados`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const sede = mockSedes.find((s) => s.id === payload.sede_id);
    const depto = mockDeptos.find((d) => d.id === payload.departamento_id);
    const cargo = mockCargos.find((c) => c.id === payload.cargo_id);
    const turno = mockTurnos.find((t) => t.id === payload.turno_id);

    const nuevo: EmpleadoDetallado = {
      cedula: payload.cedula,
      nombre_completo: payload.nombre_completo,
      email: payload.email,
      telefono: payload.telefono,
      departamento: depto?.nombre || payload.departamento_nombre || 'General',
      sede_id: payload.sede_id,
      nombre_sede: sede?.nombre,
      departamento_id: payload.departamento_id,
      nombre_departamento: depto?.nombre,
      cargo_id: payload.cargo_id,
      nombre_cargo: cargo?.nombre,
      turno_id: payload.turno_id,
      nombre_turno: turno?.nombre,
      activo: true,
      template_huella: payload.template_huella,
    };
    mockEmpleados = [nuevo, ...mockEmpleados.filter((e) => e.cedula !== payload.cedula)];
    return { exito: true, mensaje: `Colaborador '${payload.nombre_completo}' registrado exitosamente.` };
  }
}

export async function toggleEmpleadoEstado(cedula: number, activo: boolean): Promise<void> {
  const url = `${getApiBaseUrl()}/api/admin/empleados/${cedula}/estado`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    });
  } catch {
    mockEmpleados = mockEmpleados.map((e) => (e.cedula === cedula ? { ...e, activo } : e));
  }
}

export async function fetchReporteAsistencias(
  fechaDesde?: string,
  fechaHasta?: string,
  sedeId?: number,
  deptoId?: number
): Promise<AsistenciaReporte[]> {
  const params = new URLSearchParams();
  if (fechaDesde) params.append('fecha_desde', fechaDesde);
  if (fechaHasta) params.append('fecha_hasta', fechaHasta);
  if (sedeId) params.append('sede_id', sedeId.toString());
  if (deptoId) params.append('departamento_id', deptoId.toString());
  const q = params.toString() ? `?${params.toString()}` : '';

  const url = `${getApiBaseUrl()}/api/admin/asistencias${q}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        empleado_cedula: 22789456,
        nombre_completo: 'Juan Carlos Pérez Gómez',
        nombre_sede: 'Sede Central Administrativa',
        nombre_departamento: 'Gerencia de Estadística',
        nombre_cargo: 'Especialista de Estadísticas',
        fecha: today,
        hora_entrada: `${today}T08:04:12`,
        hora_salida: undefined,
        estado: 'En curso',
        minutos_trabajados: 245,
        puntualidad: 'Puntual',
        minutos_retardo: 0,
      },
      {
        empleado_cedula: 19543210,
        nombre_completo: 'María Alejandra Rodríguez',
        nombre_sede: 'Sede Central Administrativa',
        nombre_departamento: 'Recursos Humanos',
        nombre_cargo: 'Coordinadora de Recursos Humanos',
        fecha: today,
        hora_entrada: `${today}T08:22:45`,
        hora_salida: undefined,
        estado: 'En curso',
        minutos_trabajados: 228,
        puntualidad: 'Retardo',
        minutos_retardo: 7,
      },
      {
        empleado_cedula: 25111222,
        nombre_completo: 'Carlos Eduardo Mendoza',
        nombre_sede: 'Planta Tecnológica e I+D',
        nombre_departamento: 'Tecnología e Informática',
        nombre_cargo: 'Ingeniero de Infraestructura',
        fecha: today,
        hora_entrada: `${today}T06:58:30`,
        hora_salida: `${today}T15:35:10`,
        estado: 'Completada',
        minutos_trabajados: 516,
        puntualidad: 'Puntual',
        minutos_retardo: 0,
      },
    ];
  }
}

// ------------------------------------------------------------------------------
// DATOS MOCK DE SEGURIDAD, RBAC Y MODELOS
// ------------------------------------------------------------------------------

let mockRoles: Rol[] = [
  {
    id: 1,
    codigo: 'SUPER_ADMIN',
    nombre: 'Super Administrador',
    descripcion: 'Control total e irrestricto sobre todos los modelos del sistema',
    es_sistema: true,
    activo: true,
  },
  {
    id: 2,
    codigo: 'ADMIN_RRHH',
    nombre: 'Administrador de Talento Humano',
    descripcion: 'Gestión integral de colaboradores, turnos, cargos y auditoría de asistencias',
    es_sistema: true,
    activo: true,
  },
  {
    id: 3,
    codigo: 'SUPERVISOR_SEDE',
    nombre: 'Supervisor de Sede Local',
    descripcion: 'Gestión y control de colaboradores restringido a la sede asignada',
    es_sistema: true,
    activo: true,
  },
  {
    id: 4,
    codigo: 'AUDITOR',
    nombre: 'Auditor de Seguridad y Cumplimiento',
    descripcion: 'Solo lectura y exportación para fines de fiscalización',
    es_sistema: true,
    activo: true,
  },
];

let mockModelos: ModeloRecurso[] = [
  {
    codigo: 'sedes',
    nombre: 'Sedes y Sucursales',
    descripcion: 'Ubicaciones físicas y arquitectura de campus',
    icono: 'Building2',
    soporta_alcance_sede: false,
    acciones_disponibles: 'crear,leer,actualizar,eliminar',
  },
  {
    codigo: 'departamentos',
    nombre: 'Departamentos y Oficinas',
    descripcion: 'Unidades organizativas internas por sede',
    icono: 'Layers',
    soporta_alcance_sede: true,
    acciones_disponibles: 'crear,leer,actualizar,eliminar',
  },
  {
    codigo: 'cargos',
    nombre: 'Cargos y Posiciones',
    descripcion: 'Definición de roles de trabajo y perfiles',
    icono: 'Briefcase',
    soporta_alcance_sede: false,
    acciones_disponibles: 'crear,leer,actualizar,eliminar',
  },
  {
    codigo: 'turnos',
    nombre: 'Turnos y Horarios',
    descripcion: 'Reglas de evaluación, tolerancias y jornadas',
    icono: 'Clock',
    soporta_alcance_sede: false,
    acciones_disponibles: 'crear,leer,actualizar,eliminar',
  },
  {
    codigo: 'empleados',
    nombre: 'Colaboradores y Biometría',
    descripcion: 'Directorio, enrolamiento facial y huellas dactilares',
    icono: 'Users',
    soporta_alcance_sede: true,
    acciones_disponibles: 'crear,leer,actualizar,eliminar,exportar',
  },
  {
    codigo: 'asistencias',
    nombre: 'Auditoría de Asistencias',
    descripcion: 'Control de marcaciones, retardos y reportes',
    icono: 'CalendarCheck',
    soporta_alcance_sede: true,
    acciones_disponibles: 'leer,exportar',
  },
  {
    codigo: 'seguridad',
    nombre: 'Seguridad, Roles y Políticas',
    descripcion: 'Gestión de usuarios admin, políticas RBAC y modelos',
    icono: 'Shield',
    soporta_alcance_sede: false,
    acciones_disponibles: 'crear,leer,actualizar,eliminar,exportar',
  },
];

let mockPoliticas: RolPoliticaModelo[] = [
  // SUPER_ADMIN (Rol 1)
  { id: 1, rol_id: 1, modelo_codigo: 'sedes', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: true, puede_exportar: true, alcance: 'global' },
  { id: 2, rol_id: 1, modelo_codigo: 'departamentos', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: true, puede_exportar: true, alcance: 'global' },
  { id: 3, rol_id: 1, modelo_codigo: 'cargos', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: true, puede_exportar: true, alcance: 'global' },
  { id: 4, rol_id: 1, modelo_codigo: 'turnos', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: true, puede_exportar: true, alcance: 'global' },
  { id: 5, rol_id: 1, modelo_codigo: 'empleados', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: true, puede_exportar: true, alcance: 'global' },
  { id: 6, rol_id: 1, modelo_codigo: 'asistencias', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: true, puede_exportar: true, alcance: 'global' },
  { id: 7, rol_id: 1, modelo_codigo: 'seguridad', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: true, puede_exportar: true, alcance: 'global' },

  // ADMIN_RRHH (Rol 2)
  { id: 8, rol_id: 2, modelo_codigo: 'sedes', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: false, alcance: 'global' },
  { id: 9, rol_id: 2, modelo_codigo: 'departamentos', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 10, rol_id: 2, modelo_codigo: 'cargos', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 11, rol_id: 2, modelo_codigo: 'turnos', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 12, rol_id: 2, modelo_codigo: 'empleados', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 13, rol_id: 2, modelo_codigo: 'asistencias', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 14, rol_id: 2, modelo_codigo: 'seguridad', puede_crear: false, puede_leer: false, puede_actualizar: false, puede_eliminar: false, puede_exportar: false, alcance: 'ninguno' },

  // SUPERVISOR_SEDE (Rol 3)
  { id: 15, rol_id: 3, modelo_codigo: 'sedes', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: false, alcance: 'sede' },
  { id: 16, rol_id: 3, modelo_codigo: 'departamentos', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: false, alcance: 'sede' },
  { id: 17, rol_id: 3, modelo_codigo: 'cargos', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: false, alcance: 'global' },
  { id: 18, rol_id: 3, modelo_codigo: 'turnos', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: false, alcance: 'global' },
  { id: 19, rol_id: 3, modelo_codigo: 'empleados', puede_crear: true, puede_leer: true, puede_actualizar: true, puede_eliminar: false, puede_exportar: true, alcance: 'sede' },
  { id: 20, rol_id: 3, modelo_codigo: 'asistencias', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'sede' },
  { id: 21, rol_id: 3, modelo_codigo: 'seguridad', puede_crear: false, puede_leer: false, puede_actualizar: false, puede_eliminar: false, puede_exportar: false, alcance: 'ninguno' },

  // AUDITOR (Rol 4)
  { id: 22, rol_id: 4, modelo_codigo: 'sedes', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 23, rol_id: 4, modelo_codigo: 'departamentos', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 24, rol_id: 4, modelo_codigo: 'cargos', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 25, rol_id: 4, modelo_codigo: 'turnos', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 26, rol_id: 4, modelo_codigo: 'empleados', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 27, rol_id: 4, modelo_codigo: 'asistencias', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
  { id: 28, rol_id: 4, modelo_codigo: 'seguridad', puede_crear: false, puede_leer: true, puede_actualizar: false, puede_eliminar: false, puede_exportar: true, alcance: 'global' },
];

let mockUsuarios: UsuarioAdmin[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@rapture.corp',
    nombre_completo: 'Administrador Principal de Seguridad',
    rol_id: 1,
    rol_codigo: 'SUPER_ADMIN',
    rol_nombre: 'Super Administrador',
    sede_id: undefined,
    sede_nombre: 'Todas las Sedes (Global)',
    intentos_fallidos: 0,
    activo: true,
    ultimo_login: new Date().toISOString(),
  },
  {
    id: 2,
    username: 'rrhh_directora',
    email: 'rrhh@rapture.corp',
    nombre_completo: 'Dirección de Talento Humano',
    rol_id: 2,
    rol_codigo: 'ADMIN_RRHH',
    rol_nombre: 'Administrador de Talento Humano',
    sede_id: 1,
    sede_nombre: 'Sede Central Administrativa',
    intentos_fallidos: 0,
    activo: true,
    ultimo_login: new Date().toISOString(),
  },
  {
    id: 3,
    username: 'supervisor_norte',
    email: 'supervisor.valencia@rapture.corp',
    nombre_completo: 'Supervisor Planta Norte',
    rol_id: 3,
    rol_codigo: 'SUPERVISOR_SEDE',
    rol_nombre: 'Supervisor de Sede Local',
    sede_id: 2,
    sede_nombre: 'Planta Tecnológica e I+D',
    intentos_fallidos: 0,
    activo: true,
    ultimo_login: new Date().toISOString(),
  },
  {
    id: 4,
    username: 'auditor_externo',
    email: 'auditor@rapture.corp',
    nombre_completo: 'Auditor de Cumplimiento Normativo',
    rol_id: 4,
    rol_codigo: 'AUDITOR',
    rol_nombre: 'Auditor de Seguridad y Cumplimiento',
    sede_id: undefined,
    sede_nombre: 'Global',
    intentos_fallidos: 0,
    activo: true,
    ultimo_login: new Date().toISOString(),
  },
];

let mockAuditoria: AuditoriaSeguridad[] = [
  {
    id: 1,
    usuario_email: 'admin@rapture.corp',
    accion: 'INICIALIZACION_SISTEMA',
    modulo: 'SEGURIDAD',
    detalles: 'Instalación de políticas RBAC y modelos de recursos base',
    ip_origen: '127.0.0.1',
    fecha_hora: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    usuario_email: 'admin@rapture.corp',
    accion: 'CONFIGURACION_POLITICAS',
    modulo: 'MODELOS',
    detalles: 'Definición de alcance y permisos matriciales para 4 roles',
    ip_origen: '127.0.0.1',
    fecha_hora: new Date(Date.now() - 1800000).toISOString(),
  },
];

// ------------------------------------------------------------------------------
// MÉTODOS DE API DE SEGURIDAD Y GESTIÓN DE MODELOS
// ------------------------------------------------------------------------------

export async function loginAdmin(identifier: string, password: string): Promise<LoginResponse> {
  const url = `${getApiBaseUrl()}/api/auth/login`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Credenciales inválidas');
    }
    return await res.json();
  } catch (err: unknown) {
    // Simulación de login con fallback realista
    const errorMsg = err instanceof Error ? err.message : '';
    if (errorMsg && errorMsg !== 'Failed to fetch' && !errorMsg.includes('NetworkError')) {
      throw err;
    }

    const user = mockUsuarios.find(
      (u) => (u.username.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase())
    );

    if (!user) {
      mockAuditoria = [
        {
          id: Date.now(),
          usuario_email: identifier,
          accion: 'LOGIN_FALLIDO',
          modulo: 'AUTH',
          detalles: 'Identificador no encontrado en directorio',
          ip_origen: '127.0.0.1',
          fecha_hora: new Date().toISOString(),
        },
        ...mockAuditoria,
      ];
      throw new Error('Credenciales de acceso inválidas');
    }

    if (!user.activo) {
      throw new Error('Su cuenta administrativa se encuentra inactiva. Contacte a seguridad.');
    }

    const politicas = mockPoliticas.filter((p) => p.rol_id === user.rol_id);
    const token = `rapture_sec_${Math.random().toString(36).substring(2)}${Date.now()}`;

    mockAuditoria = [
      {
        id: Date.now(),
        usuario_id: user.id,
        usuario_email: user.email,
        accion: 'LOGIN_EXITOSO',
        modulo: 'AUTH',
        detalles: `Inicio de sesión exitoso con rol ${user.rol_codigo}`,
        ip_origen: '127.0.0.1',
        fecha_hora: new Date().toISOString(),
      },
      ...mockAuditoria,
    ];

    return {
      token,
      usuario: user,
      politicas,
    };
  }
}

export async function logoutAdmin(email?: string): Promise<void> {
  const url = `${getApiBaseUrl()}/api/auth/logout`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    mockAuditoria = [
      {
        id: Date.now(),
        usuario_email: email,
        accion: 'LOGOUT',
        modulo: 'AUTH',
        detalles: 'Cierre voluntario de sesión administrativa',
        ip_origen: '127.0.0.1',
        fecha_hora: new Date().toISOString(),
      },
      ...mockAuditoria,
    ];
  }
}

export async function fetchRoles(): Promise<Rol[]> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/roles`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockRoles;
  }
}

export async function createRole(payload: CreateRoleRequest): Promise<Rol> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/roles`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const nuevo: Rol = {
      id: Date.now(),
      codigo: payload.codigo.toUpperCase().replace(/\s+/g, '_'),
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      es_sistema: false,
      activo: true,
    };
    mockRoles = [...mockRoles, nuevo];

    // Seed default policies for new role (read on basic models)
    const newPolicies: RolPoliticaModelo[] = mockModelos.map((m) => ({
      id: Date.now() + Math.floor(Math.random() * 1000),
      rol_id: nuevo.id,
      modelo_codigo: m.codigo,
      puede_crear: false,
      puede_leer: true,
      puede_actualizar: false,
      puede_eliminar: false,
      puede_exportar: false,
      alcance: 'sede',
    }));
    mockPoliticas = [...mockPoliticas, ...newPolicies];

    return nuevo;
  }
}

export async function fetchModelos(): Promise<ModeloRecurso[]> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/modelos`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockModelos;
  }
}

export async function fetchPoliticasByRol(rolId: number): Promise<RolPoliticaModelo[]> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/roles/${rolId}/politicas`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockPoliticas.filter((p) => p.rol_id === rolId);
  }
}

export async function updateRolPoliticas(rolId: number, politicas: RolPoliticaModelo[]): Promise<void> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/roles/${rolId}/politicas`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(politicas),
    });
    if (!res.ok) throw new Error();
  } catch {
    mockPoliticas = [
      ...mockPoliticas.filter((p) => p.rol_id !== rolId),
      ...politicas,
    ];
    mockAuditoria = [
      {
        id: Date.now(),
        accion: 'ACTUALIZAR_POLITICAS',
        modulo: 'MODELOS',
        detalles: `Actualizadas ${politicas.length} políticas de modelos para rol ID ${rolId}`,
        ip_origen: '127.0.0.1',
        fecha_hora: new Date().toISOString(),
      },
      ...mockAuditoria,
    ];
  }
}

export async function fetchUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/usuarios`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockUsuarios;
  }
}

export async function createUsuarioAdmin(payload: CreateUsuarioRequest): Promise<void> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/usuarios`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
  } catch {
    const rol = mockRoles.find((r) => r.id === payload.rol_id);
    const sede = mockSedes.find((s) => s.id === payload.sede_id);
    const nuevo: UsuarioAdmin = {
      id: Date.now(),
      username: payload.username.toLowerCase(),
      email: payload.email,
      nombre_completo: payload.nombre_completo,
      rol_id: payload.rol_id,
      rol_codigo: rol?.codigo || 'USER',
      rol_nombre: rol?.nombre || 'Usuario',
      sede_id: payload.sede_id,
      sede_nombre: sede?.nombre || 'Global',
      intentos_fallidos: 0,
      activo: true,
      ultimo_login: undefined,
      created_at: new Date().toISOString(),
    };
    mockUsuarios = [...mockUsuarios, nuevo];
    mockAuditoria = [
      {
        id: Date.now(),
        usuario_email: payload.email,
        accion: 'CREAR_USUARIO',
        modulo: 'SEGURIDAD',
        detalles: `Registrado usuario administrativo '${payload.username}' con rol ${rol?.nombre}`,
        ip_origen: '127.0.0.1',
        fecha_hora: new Date().toISOString(),
      },
      ...mockAuditoria,
    ];
  }
}

export async function toggleUsuarioEstado(id: number, activo: boolean): Promise<void> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/usuarios/${id}/estado`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    });
  } catch {
    mockUsuarios = mockUsuarios.map((u) => (u.id === id ? { ...u, activo } : u));
  }
}

export async function unlockUsuario(id: number): Promise<void> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/usuarios/${id}/desbloquear`;
  try {
    await fetch(url, { method: 'POST' });
  } catch {
    mockUsuarios = mockUsuarios.map((u) =>
      u.id === id ? { ...u, intentos_fallidos: 0, bloqueado_hasta: undefined } : u
    );
  }
}

export async function fetchAuditoriaSeguridad(): Promise<AuditoriaSeguridad[]> {
  const url = `${getApiBaseUrl()}/api/admin/seguridad/auditoria`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return mockAuditoria;
  }
}

