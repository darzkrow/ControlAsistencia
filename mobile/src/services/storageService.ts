import { RegistroHistorialLocal, MarcacionMovilPayload } from '../types';

let offlineQueue: MarcacionMovilPayload[] = [];
let localHistory: RegistroHistorialLocal[] = [];

/**
 * Agrega un registro al historial local visible en el dispositivo
 */
export function agregarHistorialLocal(item: RegistroHistorialLocal) {
  localHistory.unshift(item);
  if (localHistory.length > 50) {
    localHistory.pop();
  }
}

/**
 * Obtiene el historial de marcaciones tomadas en esta tablet / movil
 */
export function obtenerHistorialLocal(): RegistroHistorialLocal[] {
  return [...localHistory];
}

/**
 * Encola una marcacion que fallo por desconexion a la red
 */
export function encolarMarcacionOffline(payload: MarcacionMovilPayload) {
  offlineQueue.push(payload);
  console.log(`[OFFLINE] Marcacion de cedula ${payload.cedula} encolada. Cola pendiente: ${offlineQueue.length}`);
}

/**
 * Obtiene la lista de marcaciones pendientes de sincronizacion
 */
export function obtenerColaOffline(): MarcacionMovilPayload[] {
  return [...offlineQueue];
}

/**
 * Limpia la cola offline tras sincronizacion exitosa
 */
export function limpiarColaOffline() {
  offlineQueue = [];
}
