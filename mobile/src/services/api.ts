import { SedeGeocerca, MarcacionMovilPayload, MarcacionMovilResponse } from '../types';
import { APP_CONFIG } from '../config/constants';
import {
  obtenerColaOffline,
  limpiarColaOffline,
  agregarHistorialLocal,
} from './storageService';

let activeApiUrl = APP_CONFIG.DEFAULT_API_URL;

export function setApiUrl(url: string) {
  activeApiUrl = url.replace(/\/+$/, '');
}

export function getApiUrl(): string {
  return activeApiUrl;
}

/**
 * Consulta la disponibilidad del backend
 */
export async function checkServerHealth(urlOverride?: string): Promise<boolean> {
  const url = (urlOverride || activeApiUrl) + '/health';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Obtiene la lista de sedes activas con coordenadas y radios de tolerancia para geocercas
 */
export async function fetchSedesGeocercas(): Promise<SedeGeocerca[]> {
  try {
    const res = await fetch(`${activeApiUrl}/sedes/geocercas`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API] Error al cargar geocercas, empleando fallback local:', err);
    return [APP_CONFIG.DEFAULT_SEDE_FALLBACK];
  }
}

/**
 * Registra la marcacion biometrica y evalua la geovalla GPS en el servidor
 */
export async function registrarAsistenciaMovil(
  payload: MarcacionMovilPayload
): Promise<MarcacionMovilResponse> {
  try {
    const res = await fetch(`${activeApiUrl}/asistencia/movil`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: MarcacionMovilResponse = await res.json();

    if (res.ok && data.exito) {
      // Registrar en historial local
      agregarHistorialLocal({
        id: String(data.evento_id || Date.now()),
        cedula: data.cedula,
        nombre_completo: data.nombre_completo,
        tipo_evento: data.tipo_evento,
        metodo_auth: data.metodo_auth,
        hora_12h: data.hora_12h,
        fecha: new Date().toLocaleDateString('es-VE'),
        fuera_de_sede: data.fuera_de_sede,
        distancia_metros: data.distancia_metros,
        sede_nombre: data.sede_nombre,
        sincronizado: true,
      });
    }

    return data;
  } catch (err: any) {
    console.error('[API] Fallo al enviar asistencia movil:', err.message);
    throw err;
  }
}

/**
 * Sincroniza la cola offline cuando se restablece la conectividad de red
 */
export async function sincronizarColaOffline(): Promise<{ sincronizados: number; fallidos: number }> {
  const queue = obtenerColaOffline();
  if (queue.length === 0) return { sincronizados: 0, fallidos: 0 };

  let sincronizados = 0;
  let fallidos = 0;
  const noEnviados: MarcacionMovilPayload[] = [];

  for (const item of queue) {
    try {
      await registrarAsistenciaMovil(item);
      sincronizados++;
    } catch {
      fallidos++;
      noEnviados.push(item);
    }
  }

  limpiarColaOffline();
  noEnviados.forEach((item) => {
    // Reinsertar los que hayan vuelto a fallar
    obtenerColaOffline().push(item);
  });

  return { sincronizados, fallidos };
}
