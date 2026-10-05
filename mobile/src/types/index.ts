export interface SedeGeocerca {
  id: number;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  latitud: string | number;
  longitud: string | number;
  radio_tolerancia_metros: number;
}

export interface UbicacionGPS {
  latitud: number;
  longitud: number;
  precision: number;
  altitud?: number | null;
  velocidad?: number | null;
  timestamp: number;
}

export interface GeofenceStatus {
  enSede: boolean;
  distanciaMetros: number;
  radioPermitido: number;
  sedeNombre: string;
  sedeId: number;
  alertaFraude: boolean;
}

export type TipoEventoAsistencia = 'ENTRADA' | 'SALIDA';
export type MetodoAutenticacion = 'HUELLA' | 'FACIAL' | 'HUELLA_FACIAL';

export interface MarcacionMovilPayload {
  cedula: number;
  tipo_evento: TipoEventoAsistencia;
  metodo_auth: MetodoAutenticacion;
  latitud: number;
  longitud: number;
  precision_gps: number;
  sede_id?: number;
  foto_base64?: string | null;
  template_huella?: string | null;
  dispositivo_info?: string;
}

export interface MarcacionMovilResponse {
  exito: boolean;
  evento_id?: number;
  cedula: number;
  nombre_completo: string;
  departamento: string;
  tipo_evento: TipoEventoAsistencia;
  metodo_auth: MetodoAutenticacion;
  fuera_de_sede: boolean;
  distancia_metros: number;
  radio_tolerancia_metros: number;
  alerta_fraude_rrhh: boolean;
  sede_nombre: string;
  hora_12h: string;
  mensaje: string;
}

export interface RegistroHistorialLocal {
  id: string;
  cedula: number;
  nombre_completo: string;
  tipo_evento: TipoEventoAsistencia;
  metodo_auth: MetodoAutenticacion;
  hora_12h: string;
  fecha: string;
  fuera_de_sede: boolean;
  distancia_metros: number;
  sede_nombre: string;
  sincronizado: boolean;
  foto_uri?: string | null;
}
