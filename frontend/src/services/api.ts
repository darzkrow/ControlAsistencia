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
  fuera_de_sede_entrada?: boolean;
  distancia_sede_entrada?: number;
  fuera_de_sede_salida?: boolean;
  distancia_sede_salida?: number;
  radio_tolerancia_metros?: number;
  alerta_fraude_rrhh?: boolean;
  dispositivo_movil_info?: string;
  latitud_entrada?: string | number;
  longitud_entrada?: string | number;
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

export interface DispositivoBiometrico {
  id: number;
  nombre: string;
  marca: 'ZKTeco' | 'Hikvision' | 'Dahua' | 'Anviz' | 'Suprema' | 'Generico' | string;
  modelo: string;
  direccion_ip: string;
  puerto: number;
  protocolo: string;
  clave_comunicacion?: string;
  numero_serie?: string;
  sede_id?: number | null;
  nombre_sede?: string;
  tipo_acceso: 'entrada' | 'salida' | 'ambos';
  activo: boolean;
  estado_conexion: 'en_linea' | 'desconectado' | 'error';
  ultimo_ping?: string | null;
  latencia_ms?: number;
  ultima_sincronizacion?: string | null;
  total_marcaciones_sincronizadas?: number;
  created_at?: string;
}

export interface CreateDispositivoRequest {
  nombre: string;
  marca: string;
  modelo?: string;
  direccion_ip: string;
  puerto: number;
  protocolo?: string;
  clave_comunicacion?: string;
  numero_serie?: string;
  sede_id?: number | null;
  tipo_acceso?: 'entrada' | 'salida' | 'ambos';
}

export interface PingDispositivoResponse {
  ok: boolean;
  online: boolean;
  latencia_ms: number;
  mensaje: string;
}

export interface SyncDispositivoResponse {
  ok: boolean;
  marcaciones_ingeridas: number;
  origen?: string;
  mensaje: string;
}

export interface EnrolarCapturaResponse {
  exito: boolean;
  cedula?: number;
  template_huella?: string;
  origen?: string;
  mensaje: string;
}

// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Configuración de URL Base y Sesión de Seguridad
// ------------------------------------------------------------------------------
// Lee la variable VITE_API_BASE_URL del archivo .env (por defecto '/api/v1')
// Permite modificar la versión o el host en un solo lugar (ej: /api/v2, http://localhost:3000/api/v2)
export const DEFAULT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem('rapture_api_url');
  if (custom && custom.trim() !== '') {
    return custom.trim().replace(/\/+$/, '');
  }
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string) {
  if (!url || url.trim() === '' || url.trim() === DEFAULT_API_BASE_URL) {
    localStorage.removeItem('rapture_api_url');
  } else {
    localStorage.setItem('rapture_api_url', url.trim().replace(/\/+$/, ''));
  }
}

/**
 * Construye la URL completa anteponiendo la base versionada configurada en .env
 * Ejemplo:
 *   buildApiUrl('/admin/sedes') -> '/api/v1/admin/sedes' (o 'http://localhost:3000/api/v2/admin/sedes')
 */
export function buildApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${normalized}`;
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
    const clean = customUrl.trim().replace(/\/+$/, '');
    candidateUrls.push(clean.endsWith('/health') ? clean : `${clean}/health`);
  }

  // URL generada con buildApiUrl a partir de .env
  candidateUrls.push(buildApiUrl('/health'));
  candidateUrls.push('/api/v1/health');
  candidateUrls.push('/api/health');
  candidateUrls.push('http://127.0.0.1:3000/api/v1/health');
  candidateUrls.push('http://127.0.0.1:3000/api/health');

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
      // Continuar al siguiente candidato
    }
  }
  return false;
}

// ------------------------------------------------------------------------------
// KIOSKO BIOMÉTRICO
// ------------------------------------------------------------------------------
export async function registrarEscaneo(payload: EscaneoRequest): Promise<EscaneoResponse> {
  const url = buildApiUrl('/escaneo');

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
// PORTAL ADMINISTRATIVO - SERVICIOS HTTP CONEXIÓN DIRECTA POSTGRESQL (SIN MOCKS)
// ------------------------------------------------------------------------------

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const url = buildApiUrl('/admin/dashboard');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar métricas del sistema`);
  }
  return await res.json();
}

export async function fetchSedes(): Promise<Sede[]> {
  const url = buildApiUrl('/admin/sedes');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar sedes`);
  }
  return await res.json();
}

export async function createSede(payload: CreateSedeRequest): Promise<Sede> {
  const url = buildApiUrl('/admin/sedes');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al crear sede`);
  }
  return await res.json();
}

export async function fetchDepartamentos(sedeId?: number): Promise<Departamento[]> {
  const q = sedeId ? `?sede_id=${sedeId}` : '';
  const url = buildApiUrl(`/admin/departamentos${q}`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar departamentos`);
  }
  return await res.json();
}

export async function createDepartamento(payload: CreateDepartamentoRequest): Promise<Departamento> {
  const url = buildApiUrl('/admin/departamentos');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al crear departamento`);
  }
  return await res.json();
}

export async function fetchCargos(departamentoId?: number): Promise<Cargo[]> {
  const q = departamentoId ? `?departamento_id=${departamentoId}` : '';
  const url = buildApiUrl(`/admin/cargos${q}`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar cargos`);
  }
  return await res.json();
}

export async function createCargo(payload: CreateCargoRequest): Promise<Cargo> {
  const url = buildApiUrl('/admin/cargos');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al crear cargo`);
  }
  return await res.json();
}

export async function fetchTurnos(): Promise<Turno[]> {
  const url = buildApiUrl('/admin/turnos');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar turnos`);
  }
  return await res.json();
}

export async function createTurno(payload: CreateTurnoRequest): Promise<Turno> {
  const url = buildApiUrl('/admin/turnos');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al crear turno`);
  }
  return await res.json();
}

export async function fetchEmpleados(sedeId?: number, deptoId?: number): Promise<EmpleadoDetallado[]> {
  const params = new URLSearchParams();
  if (sedeId) params.append('sede_id', sedeId.toString());
  if (deptoId) params.append('departamento_id', deptoId.toString());
  const q = params.toString() ? `?${params.toString()}` : '';

  const url = buildApiUrl(`/admin/empleados${q}`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar colaboradores`);
  }
  return await res.json();
}

export async function createEmpleado(payload: CreateEmpleadoRequest): Promise<{ exito: boolean; mensaje: string }> {
  const url = buildApiUrl('/admin/empleados');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al registrar colaborador`);
  }
  return await res.json();
}

export async function toggleEmpleadoEstado(cedula: number, activo: boolean): Promise<void> {
  const url = buildApiUrl(`/admin/empleados/${cedula}/estado`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al modificar estado del colaborador`);
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

  const url = buildApiUrl(`/admin/asistencias${q}`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar auditoría de asistencias`);
  }
  return await res.json();
}

// ------------------------------------------------------------------------------
// MÉTODOS DE API DE SEGURIDAD, AUTENTICACIÓN Y GESTIÓN DE MODELOS RBAC
// ------------------------------------------------------------------------------

export async function loginAdmin(identifier: string, password: string): Promise<LoginResponse> {
  const url = buildApiUrl('/auth/login');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Credenciales de acceso inválidas');
  }
  return await res.json();
}

export async function logoutAdmin(email?: string): Promise<void> {
  const url = buildApiUrl('/auth/logout');
  try {
    await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
  } catch {
    // Silencioso en logout
  }
}

export async function fetchRoles(): Promise<Rol[]> {
  const url = buildApiUrl('/admin/seguridad/roles');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar roles`);
  }
  return await res.json();
}

export async function createRole(payload: CreateRoleRequest): Promise<Rol> {
  const url = buildApiUrl('/admin/seguridad/roles');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al crear rol`);
  }
  return await res.json();
}

export async function fetchModelos(): Promise<ModeloRecurso[]> {
  const url = buildApiUrl('/admin/seguridad/modelos');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar modelos de recursos`);
  }
  return await res.json();
}

export async function fetchPoliticasByRol(rolId: number): Promise<RolPoliticaModelo[]> {
  const url = buildApiUrl(`/admin/seguridad/roles/${rolId}/politicas`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar políticas del rol`);
  }
  return await res.json();
}

export async function updateRolPoliticas(rolId: number, politicas: RolPoliticaModelo[]): Promise<void> {
  const url = buildApiUrl(`/admin/seguridad/roles/${rolId}/politicas`);
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(politicas),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al actualizar políticas de modelos`);
  }
}

export async function fetchUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  const url = buildApiUrl('/admin/seguridad/usuarios');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar usuarios administrativos`);
  }
  return await res.json();
}

export async function createUsuarioAdmin(payload: CreateUsuarioRequest): Promise<void> {
  const url = buildApiUrl('/admin/seguridad/usuarios');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al registrar usuario`);
  }
}

export async function toggleUsuarioEstado(id: number, activo: boolean): Promise<void> {
  const url = buildApiUrl(`/admin/seguridad/usuarios/${id}/estado`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al modificar estado del usuario`);
  }
}

export async function unlockUsuario(id: number): Promise<void> {
  const url = buildApiUrl(`/admin/seguridad/usuarios/${id}/desbloquear`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al desbloquear usuario`);
  }
}

export async function fetchAuditoriaSeguridad(): Promise<AuditoriaSeguridad[]> {
  const url = buildApiUrl('/admin/seguridad/auditoria');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar auditoría forense`);
  }
  return await res.json();
}

// ------------------------------------------------------------------------------
// Dispositivos Biométricos y Control de Acceso IP
// ------------------------------------------------------------------------------

export async function fetchDispositivos(): Promise<DispositivoBiometrico[]> {
  const url = buildApiUrl('/admin/dispositivos');
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar dispositivos biometricos`);
  }
  return await res.json();
}

export async function createDispositivo(payload: CreateDispositivoRequest): Promise<DispositivoBiometrico> {
  const url = buildApiUrl('/admin/dispositivos');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al registrar dispositivo biometrico`);
  }
  return await res.json();
}

export async function updateDispositivo(id: number, payload: Partial<CreateDispositivoRequest> & { activo?: boolean }): Promise<DispositivoBiometrico> {
  const url = buildApiUrl(`/admin/dispositivos/${id}`);
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al actualizar dispositivo`);
  }
  return await res.json();
}

export async function deleteDispositivo(id: number): Promise<void> {
  const url = buildApiUrl(`/admin/dispositivos/${id}`);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al eliminar dispositivo`);
  }
}

export async function pingDispositivo(id: number): Promise<PingDispositivoResponse> {
  const url = buildApiUrl(`/admin/dispositivos/${id}/ping`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al ejecutar ping al dispositivo`);
  }
  return await res.json();
}

export async function sincronizarDispositivo(id: number): Promise<SyncDispositivoResponse> {
  const url = buildApiUrl(`/admin/dispositivos/${id}/sincronizar`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al sincronizar marcaciones del dispositivo`);
  }
  return await res.json();
}

export async function enrolarCapturaDispositivo(id: number, cedula: number, forzarSimulacion = false): Promise<EnrolarCapturaResponse> {
  const url = buildApiUrl(`/admin/dispositivos/${id}/enrolar-captura`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ cedula, forzar_simulacion: forzarSimulacion }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al ejecutar enrolamiento biometrico`);
  }
  return await res.json();
}

// ------------------------------------------------------------------------------
// GESTION DE ALERTAS DE FRAUDE Y GEOVALLAS GPS (RRHH)
// ------------------------------------------------------------------------------

export interface AlertaFraudeRRHH {
  id: number;
  empleado_cedula: number;
  nombre_completo: string;
  departamento: string;
  sede_nombre: string;
  radio_tolerancia_metros: number;
  fecha_hora: string;
  tipo_evento: string;
  metodo_auth: string;
  foto_path?: string;
  latitud?: string | number;
  longitud?: string | number;
  precision_gps?: string | number;
  distancia_metros: number;
  fuera_de_sede: boolean;
  alerta_fraude_rrhh: boolean;
  estado_auditoria_rrhh: string;
  notas_auditoria?: string;
  origen_dispositivo?: string;
}

export async function fetchAlertasFraude(): Promise<AlertaFraudeRRHH[]> {
  const url = buildApiUrl('/asistencia/alertas-fraude');
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function resolverAlertaFraude(
  id: number,
  estado_auditoria: string,
  notas: string
): Promise<boolean> {
  const url = buildApiUrl(`/asistencia/alertas-fraude/${id}/auditar`);
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ estado_auditoria, notas }),
  });
  return res.ok;
}


