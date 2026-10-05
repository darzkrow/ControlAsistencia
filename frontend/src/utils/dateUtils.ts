/**
 * Utilidades Centralizadas para Gestion Horaria y Formato de 12 Horas
 * Configurado con soporte de Zona Horaria parametrizable (por defecto 'America/Caracas')
 * Asegura formato de 12 horas (AM/PM) en toda la aplicacion.
 */

// Zona horaria por defecto parametrizable mediante variable de entorno
export const DEFAULT_TIMEZONE = import.meta.env.VITE_TIMEZONE || 'America/Caracas';

/**
 * Obtiene la zona horaria activa de la aplicacion
 */
export function getAppTimezone(): string {
  return (import.meta.env.VITE_TIMEZONE || DEFAULT_TIMEZONE).trim();
}

/**
 * Formatea una hora garantizando estrictamente formato de 12 horas (hh:mm:ss AM/PM o hh:mm AM/PM)
 * Admite objetos Date, strings ISO (2026-10-04T15:30:00Z), strings de PostgreSQL (2026-10-04 15:30:00)
 * o valores de hora pura (08:00:00, 17:30).
 *
 * @param dateInput Fecha u hora a formatear
 * @param includeSeconds Indica si se deben incluir los segundos (por defecto true)
 * @returns Cadena con hora formateada a 12 horas con AM/PM (ej. "03:45:12 PM", "08:00 AM")
 */
export function formatTimeTo12h(dateInput?: string | Date | null, includeSeconds = true): string {
  if (!dateInput) return includeSeconds ? '--:--:--' : '--:--';

  // Caso 1: String de hora simple (ej. "08:00", "08:00:00", "17:30")
  if (typeof dateInput === 'string') {
    const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const match = dateInput.trim().match(timeRegex);
    if (match) {
      const rawHour = parseInt(match[1], 10);
      const minutes = match[2];
      const seconds = match[3] || '00';
      const suffix = rawHour >= 12 ? 'PM' : 'AM';
      const hour12 = rawHour % 12 || 12;
      const paddedHour = String(hour12).padStart(2, '0');

      if (includeSeconds && match[3]) {
        return `${paddedHour}:${minutes}:${seconds} ${suffix}`;
      }
      return `${paddedHour}:${minutes} ${suffix}`;
    }
  }

  // Caso 2: Objeto Date o string timestamp completo
  let dateObj: Date;
  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    // Si viene en formato "YYYY-MM-DD HH:MM:SS" de Postgres, normalizar a ISO
    const cleanStr = typeof dateInput === 'string' && dateInput.includes(' ') && !dateInput.includes('T')
      ? dateInput.replace(' ', 'T')
      : dateInput;
    dateObj = new Date(cleanStr);
  }

  if (isNaN(dateObj.getTime())) {
    return String(dateInput);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: getAppTimezone(),
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    });
    return formatter.format(dateObj);
  } catch {
    // Fallback en caso de que el entorno no reconozca la zona horaria
    const fallbackFormatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    });
    return fallbackFormatter.format(dateObj);
  }
}

/**
 * Formatea una fecha respetando la zona horaria configurada
 * @param dateInput Fecha a formatear
 * @param style 'long' (ej. "lunes, 4 de octubre de 2026") o 'short' (ej. "04/10/2026")
 */
export function formatDateToLocal(dateInput?: string | Date | null, style: 'short' | 'long' = 'long'): string {
  if (!dateInput) return '--/--/----';

  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(dateObj.getTime())) return String(dateInput);

  try {
    if (style === 'short') {
      const formatter = new Intl.DateTimeFormat('es-ES', {
        timeZone: getAppTimezone(),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(dateObj);
    }

    const formatter = new Intl.DateTimeFormat('es-ES', {
      timeZone: getAppTimezone(),
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return formatter.format(dateObj);
  } catch {
    return dateObj.toLocaleDateString('es-ES');
  }
}

/**
 * Formatea fecha y hora completa con garantia de formato 12 horas
 * @param dateInput Fecha u hora completa
 * @returns Cadena con fecha y hora (ej. "04/10/2026, 03:45:12 PM")
 */
export function formatDateTimeTo12h(dateInput?: string | Date | null): string {
  if (!dateInput) return '--/--/---- --:--:--';

  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(dateObj.getTime())) return String(dateInput);

  const fechaStr = formatDateToLocal(dateObj, 'short');
  const horaStr = formatTimeTo12h(dateObj, true);
  return `${fechaStr}, ${horaStr}`;
}

/**
 * Devuelve la etiqueta descriptiva de la zona horaria activa
 */
export function getTimezoneBadge(): string {
  const tz = getAppTimezone();
  if (tz === 'America/Caracas') return 'America/Caracas (GMT-4)';
  return tz;
}
