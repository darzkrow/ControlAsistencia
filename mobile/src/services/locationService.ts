import * as Location from 'expo-location';
import { SedeGeocerca, UbicacionGPS, GeofenceStatus } from '../types';
import { APP_CONFIG } from '../config/constants';

/**
 * Calcula la distancia geodesica entre dos coordenadas GPS usando la formula de Haversine (en metros)
 */
export function calcularDistanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  const R = 6371000; // Radio de la Tierra en metros
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Evalua si la coordenada actual se encuentra dentro del perimetro de geovalla de la sede indicada
 */
export function evaluarGeovalla(
  coords: UbicacionGPS | null,
  sedes: SedeGeocerca[],
  sedeSeleccionadaId?: number
): GeofenceStatus {
  const sedeActiva =
    sedes.find((s) => s.id === sedeSeleccionadaId) ||
    sedes[0] ||
    APP_CONFIG.DEFAULT_SEDE_FALLBACK;

  if (!coords) {
    return {
      enSede: false,
      distanciaMetros: 99999,
      radioPermitido: sedeActiva.radio_tolerancia_metros,
      sedeNombre: sedeActiva.nombre,
      sedeId: sedeActiva.id,
      alertaFraude: true,
    };
  }

  const distancia = calcularDistanciaHaversine(
    coords.latitud,
    coords.longitud,
    Number(sedeActiva.latitud),
    Number(sedeActiva.longitud)
  );

  const enSede = distancia <= sedeActiva.radio_tolerancia_metros;

  return {
    enSede,
    distanciaMetros: distancia,
    radioPermitido: sedeActiva.radio_tolerancia_metros,
    sedeNombre: sedeActiva.nombre,
    sedeId: sedeActiva.id,
    alertaFraude: !enSede,
  };
}

/**
 * Solicita permisos de ubicacion y obtiene la posicion GPS actual
 */
export async function obtenerPosicionActual(): Promise<UbicacionGPS> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[GPS] Permiso de ubicacion no otorgado. Empleando ubicacion simulada de pruebas.');
      return {
        latitud: APP_CONFIG.DEFAULT_SEDE_FALLBACK.latitud,
        longitud: APP_CONFIG.DEFAULT_SEDE_FALLBACK.longitud,
        precision: 10,
        timestamp: Date.now(),
      };
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitud: loc.coords.latitude,
      longitud: loc.coords.longitude,
      precision: loc.coords.accuracy || 10,
      altitud: loc.coords.altitude,
      velocidad: loc.coords.speed,
      timestamp: loc.timestamp,
    };
  } catch (err) {
    console.warn('[GPS] Error al obtener ubicacion real. Fallback a sede de prueba:', err);
    return {
      latitud: APP_CONFIG.DEFAULT_SEDE_FALLBACK.latitud,
      longitud: APP_CONFIG.DEFAULT_SEDE_FALLBACK.longitud,
      precision: 15,
      timestamp: Date.now(),
    };
  }
}
