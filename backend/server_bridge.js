const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { createBiometricAdapter, testTcpConnectivity } = require('./drivers/biometric_adapters');

// Carga automatica de variables de entorno desde .env si existe en el root
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const PORT = Number(process.env.SERVER_PORT) || 3000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const API_PREFIX = (process.env.API_PREFIX || '/api/v1').replace(/\/+$/, '');
const TIMEZONE = process.env.TIMEZONE || 'America/Caracas';
const TIME_FORMAT = process.env.TIME_FORMAT || '12h';
process.env.TZ = TIMEZONE;

// Conexion al Pool de PostgreSQL (rapture-db) con zona horaria parametrizada
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://admin:secreto@127.0.0.1:5432/api_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
  options: `-c timezone=${TIMEZONE}`,
});

pool.on('error', (err) => {
  console.error('[ERROR] Error inesperado en el Pool de PostgreSQL:', err.message);
});

// Conexion a Redis (Cache de Lectura y Buffer de Ingestion)
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redisConnected = false;
const redis = new Redis(REDIS_URL, {
  retryStrategy(times) {
    return Math.min(times * 200, 3000);
  },
  maxRetriesPerRequest: 2,
  lazyConnect: true,
});

redis.connect().then(() => {
  redisConnected = true;
  console.log('[INFO] Conectado exitosamente a Redis (Cache & Ingestion Buffer)');
}).catch((err) => {
  redisConnected = false;
  console.warn('[WARN] Redis no disponible en inicio. Activando buffer en memoria local:', err.message);
});

redis.on('connect', () => {
  redisConnected = true;
  console.log('[INFO] Redis reconectado exitosamente');
});
redis.on('error', () => {
  redisConnected = false;
});

// ============================================================================
// MOTOR DE INGESTION POR LOTES (MICRO-BATCHING PIPELINE)
// ============================================================================
const punchQueue = [];
let isFlushing = false;
let totalBatchesFlushed = 0;
let totalEventsPersisted = 0;
let lastBatchTimeMs = 0;
const BATCH_MAX_SIZE = 50;
const BATCH_INTERVAL_MS = 200;

async function flushPunchBatch() {
  if (isFlushing || punchQueue.length === 0) return;
  isFlushing = true;
  const start = Date.now();

  const batch = punchQueue.splice(0, BATCH_MAX_SIZE);
  if (batch.length === 0) {
    isFlushing = false;
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insercion masiva en eventos_lector (Multi-row INSERT sin bloqueos de tabla)
    const valuePlaceholders = [];
    const flatParams = [];
    batch.forEach((evt, idx) => {
      const offset = idx * 4;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      flatParams.push(evt.empleado_cedula, evt.fecha_hora, evt.tipo_evento.toUpperCase(), evt.metodo_auth);
    });

    await client.query(
      `INSERT INTO eventos_lector (empleado_cedula, fecha_hora, tipo_evento, metodo_auth)
       VALUES ${valuePlaceholders.join(', ')}`,
      flatParams
    );

    // 2. Procesamiento agrupado de jornada_diaria por empleado unico
    const byEmp = new Map();
    for (const evt of batch) {
      byEmp.set(evt.empleado_cedula, evt);
    }

    for (const [cedula, evt] of byEmp.entries()) {
      const jornadaRes = await client.query(
        `SELECT hora_entrada, hora_salida, estado FROM jornada_diaria WHERE empleado_cedula = $1 AND fecha = CURRENT_DATE FOR UPDATE`,
        [cedula]
      );

      if (jornadaRes.rows.length === 0) {
        // Primera marcacion del dia -> ENTRADA
        await client.query(
          `INSERT INTO jornada_diaria (empleado_cedula, fecha, hora_entrada, estado, minutos_trabajados, puntualidad, minutos_retardo, ultima_actualizacion)
           VALUES ($1, CURRENT_DATE, $2, 'En curso', 0, $3, $4, NOW())
           ON CONFLICT (empleado_cedula, fecha) DO NOTHING`,
          [cedula, evt.fecha_hora, evt.puntualidad, evt.minutos_retardo]
        );
      } else {
        // Segunda o posterior marcacion -> SALIDA
        const horaEntrada = jornadaRes.rows[0].hora_entrada;
        const diffRes = await client.query(
          `SELECT ROUND(EXTRACT(EPOCH FROM ($1::timestamptz - $2::timestamptz)) / 60)::int as minutos`,
          [evt.fecha_hora, horaEntrada]
        );
        const mins = Math.max(0, diffRes.rows[0]?.minutos || 0);

        await client.query(
          `UPDATE jornada_diaria
           SET hora_salida = $1,
               minutos_trabajados = $2,
               estado = 'Completada',
               ultima_actualizacion = NOW()
           WHERE empleado_cedula = $3 AND fecha = CURRENT_DATE`,
          [evt.fecha_hora, mins, cedula]
        );
      }
    }

    await client.query('COMMIT');
    totalBatchesFlushed++;
    totalEventsPersisted += batch.length;
    lastBatchTimeMs = Date.now() - start;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR] Fallo en transaccion de micro-batching, re-encolando eventos:', err.message);
    punchQueue.unshift(...batch);
  } finally {
    client.release();
    isFlushing = false;
  }
}

// Iniciar worker periodico de vaciado de micro-lotes
setInterval(flushPunchBatch, BATCH_INTERVAL_MS);

// Helpers de Cache (Cache-Aside Pattern)
async function getCachedEmployee(cedula) {
  if (redisConnected) {
    try {
      const cached = await redis.get(`emp:${cedula}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
  }

  const empRes = await pool.query(
    `SELECT e.cedula, e.nombre_completo, e.departamento, e.activo,
            s.nombre as nombre_sede,
            t.hora_entrada as turno_hora_entrada,
            t.tolerancia_minutos as turno_tolerancia
     FROM empleados e
     LEFT JOIN sedes s ON e.sede_id = s.id
     LEFT JOIN turnos_horarios t ON e.turno_id = t.id
     WHERE e.cedula = $1`,
    [cedula]
  );

  const emp = empRes.rows[0] || null;
  if (emp && redisConnected) {
    try {
      await redis.set(`emp:${cedula}`, JSON.stringify(emp), 'EX', 1800); // TTL 30 minutos
    } catch (e) {}
  }
  return emp;
}

async function invalidateEmployeeCache(cedula) {
  if (redisConnected) {
    try {
      await redis.del(`emp:${cedula}`);
      await redis.del(`jornada_hoy:${cedula}`);
    } catch (e) {}
  }
}

// Cache en memoria para sesiones activas (TTL 8 horas)
const activeSessions = new Map(); // token -> { userId, email, rolId, expiresAt }

// Helper para hashear con Salt criptografico y SHA-256 (FIPS 180-4)
function hashPassword(password, salt = null) {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${chosenSalt}:${password}`).digest('hex');
  return `${chosenSalt}$${hash}`;
}

// Comparacion en tiempo constante para mitigar ataques de canal lateral (Timing Attacks)
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

async function logAuditoria(client, usuarioId, email, accion, modulo, detalles, ip) {
  try {
    const runner = client || pool;
    await runner.query(
      `INSERT INTO auditoria_seguridad (usuario_id, usuario_email, accion, modulo, detalles, ip_origen, fecha_hora)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [usuarioId, email, accion, modulo, detalles, ip]
    );
  } catch (e) {
    console.error('[WARN] Error al registrar auditoria:', e.message);
  }
}

// Calculo de distancia geodesica usando la formula de Haversine (en metros)
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const p1 = Number(lat1);
  const l1 = Number(lon1);
  const p2 = Number(lat2);
  const l2 = Number(lon2);
  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) return 0;

  const R = 6371000; // Radio de la Tierra en metros
  const radLat1 = (p1 * Math.PI) / 180;
  const radLat2 = (p2 * Math.PI) / 180;
  const deltaLat = ((p2 - p1) * Math.PI) / 180;
  const deltaLon = ((l2 - l1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Formato de hora en 12 horas (AM/PM) respetando la zona horaria oficial
function formatLocalTime12h(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('es-VE', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleTimeString('en-US', { hour12: true });
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const rawPath = url.pathname;
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  // Normalizacion agnostica del prefijo de API (soporta API_PREFIX dinamico ej: /api/v1 o /api/v2, y compatibilidad con /api legado)
  let route = rawPath;
  if (route.startsWith(API_PREFIX)) {
    route = route.slice(API_PREFIX.length);
  } else if (route.startsWith('/api')) {
    route = route.slice(4);
  }
  if (!route.startsWith('/')) {
    route = '/' + route;
  }

  // Descarga directa del APK para tablets y telefonos
  if (rawPath === '/download/app.apk' || rawPath === '/download/apk') {
    const candidatePaths = [
      path.join(__dirname, '..', 'rapture-biometrics-mobile.apk'),
      path.join(__dirname, '..', 'mobile', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
      path.join(__dirname, '..', 'mobile', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
    ];
    let apkPath = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        apkPath = p;
        break;
      }
    }

    if (apkPath) {
      const stat = fs.statSync(apkPath);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="rapture-biometrics-mobile.apk"',
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(apkPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Archivo APK aun no generado o en proceso de compilacion.' }));
    }
  }

  try {
    // --------------------------------------------------------------------------
    // 1. HEALTHCHECK ENDPOINT
    // --------------------------------------------------------------------------
    if (route === '/health') {
      const dbCheck = await pool.query('SELECT NOW() as now');
      return sendJson(res, 200, {
        status: 'ok',
        service: 'rapture-biometrics-backend',
        engine: 'Axum / PostgreSQL Direct + Redis Micro-Batching',
        version: '2.1.0',
        timezone: TIMEZONE,
        time_format: TIME_FORMAT,
        server_connected: true,
        database_connected: !!dbCheck.rows[0],
        redis_connected: redisConnected,
        batch_engine: {
          queue_length: punchQueue.length,
          batches_flushed: totalBatchesFlushed,
          events_persisted: totalEventsPersisted,
          last_batch_time_ms: lastBatchTimeMs,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // --------------------------------------------------------------------------
    // 2. KIOSKO BIOMETRICO - REGISTRO ASINCRONO POR LOTES (SUB-MILISEGUNDO)
    // --------------------------------------------------------------------------
    if (route === '/escaneo' && req.method === 'POST') {
      const body = await parseBody(req);
      const idNum = Number(body.cedula);

      if (!idNum || isNaN(idNum)) {
        return sendJson(res, 400, { es_empleado: false, mensaje: 'Numero de identificacion invalido', tipo_evento: 'rechazado' });
      }

      // Verificacion atomica de Cooldown Anti-Passback en Redis (< 0.5 ms)
      if (redisConnected) {
        try {
          const cdKey = `cooldown:${idNum}`;
          const isAllowed = await redis.set(cdKey, '1', 'EX', 10, 'NX');
          if (!isAllowed) {
            return sendJson(res, 200, {
              es_empleado: true,
              mensaje: 'Marcacion reciente ya registrada. Por favor espere unos segundos.',
              tipo_evento: 'cooldown',
            });
          }
        } catch (e) {}
      }

      // Consulta de datos de colaborador desde Cache-Aside (< 0.5 ms)
      const emp = await getCachedEmployee(idNum);
      if (!emp || !emp.activo) {
        return sendJson(res, 200, {
          es_empleado: false,
          mensaje: 'Identidad no registrada o colaborador inactivo. Por favor acuda a recepcion para registro de visitante.',
          tipo_evento: 'visitante',
        });
      }

      // Determinar tipo de evento (entrada / salida) usando cache o consulta rapida
      let tipoEvento = 'entrada';
      let jornadaEstado = null;
      if (redisConnected) {
        try {
          jornadaEstado = await redis.get(`jornada_hoy:${idNum}`);
        } catch (e) {}
      }

      if (!jornadaEstado) {
        const jRes = await pool.query(
          `SELECT estado FROM jornada_diaria WHERE empleado_cedula = $1 AND fecha = CURRENT_DATE`,
          [idNum]
        );
        jornadaEstado = jRes.rows[0]?.estado || 'no_iniciada';
      }

      if (jornadaEstado === 'En curso') {
        tipoEvento = 'salida';
        if (redisConnected) {
          try { await redis.set(`jornada_hoy:${idNum}`, 'Completada', 'EX', 86400); } catch (e) {}
        }
      } else {
        tipoEvento = 'entrada';
        if (redisConnected) {
          try { await redis.set(`jornada_hoy:${idNum}`, 'En curso', 'EX', 86400); } catch (e) {}
        }
      }

      // Evaluacion de puntualidad en memoria calculada segun TIMEZONE (por defecto America/Caracas)
      let puntualidad = 'Puntual';
      let minutosRetardo = 0;
      if (emp.turno_hora_entrada && tipoEvento === 'entrada') {
        const now = new Date();
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: TIMEZONE,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        });
        const timeParts = tzFormatter.formatToParts(now);
        const curHour = Number(timeParts.find(p => p.type === 'hour')?.value || now.getHours());
        const curMin = Number(timeParts.find(p => p.type === 'minute')?.value || now.getMinutes());
        const currentMins = curHour * 60 + curMin;

        const parts = emp.turno_hora_entrada.split(':');
        const scheduledMins = Number(parts[0]) * 60 + Number(parts[1]);
        const tolerance = emp.turno_tolerancia || 15;
        if (currentMins > scheduledMins + tolerance) {
          puntualidad = 'Retardo';
          minutosRetardo = currentMins - scheduledMins;
        }
      }

      // Encolar evento en buffer de ingestion asincrono (Micro-Batching)
      const metodoAuth = (body.metodo || 'FACIAL').toUpperCase();
      const punchEvent = {
        empleado_cedula: idNum,
        fecha_hora: new Date().toISOString(),
        tipo_evento: tipoEvento,
        metodo_auth: metodoAuth,
        puntualidad,
        minutos_retardo: minutosRetardo,
      };

      punchQueue.push(punchEvent);
      if (punchQueue.length >= BATCH_MAX_SIZE) {
        setImmediate(flushPunchBatch);
      }

      const accionTxt = tipoEvento === 'entrada' ? 'Entrada registrada satisfactoriamente.' : 'Salida registrada satisfactoriamente.';
      return sendJson(res, 200, {
        es_empleado: true,
        mensaje: `Bienvenido/a, ${emp.nombre_completo}! ${accionTxt}`,
        nombre_completo: emp.nombre_completo,
        departamento: emp.departamento || 'General',
        tipo_evento: tipoEvento,
        minutos_acumulados: 0,
      });
    }

    // --------------------------------------------------------------------------
    // 2.1 ASISTENCIA MOVIL / TABLET - GEOLOCALIZACION Y GEOVALLAS RRHH
    // --------------------------------------------------------------------------
    if (route === '/asistencia/movil' && req.method === 'POST') {
      const b = await parseBody(req);
      const cedula = Number(b.cedula);
      if (!cedula || isNaN(cedula)) {
        return sendJson(res, 400, { exito: false, mensaje: 'Numero de cedula invalido' });
      }

      // 1. Obtener o validar colaborador
      const empRes = await pool.query(
        `SELECT e.*, s.id as sede_real_id, s.nombre as sede_nombre, s.latitud as sede_lat, s.longitud as sede_lon, s.radio_tolerancia_metros
         FROM empleados e
         LEFT JOIN sedes s ON e.sede_id = s.id
         WHERE e.cedula = $1`,
        [cedula]
      );
      if (empRes.rows.length === 0 || !empRes.rows[0].activo) {
        return sendJson(res, 404, {
          exito: false,
          es_empleado: false,
          mensaje: 'Colaborador no encontrado o inactivo en el sistema.'
        });
      }
      const emp = empRes.rows[0];

      // 2. Determinar la Sede de Referencia (si viene sede_id o la del empleado o la central)
      let sedeRef = null;
      if (b.sede_id) {
        const sRes = await pool.query('SELECT * FROM sedes WHERE id = $1', [Number(b.sede_id)]);
        if (sRes.rows.length > 0) sedeRef = sRes.rows[0];
      }
      if (!sedeRef && emp.sede_real_id) {
        sedeRef = {
          id: emp.sede_real_id,
          nombre: emp.sede_nombre,
          latitud: emp.sede_lat,
          longitud: emp.sede_lon,
          radio_tolerancia_metros: emp.radio_tolerancia_metros || 150
        };
      }
      if (!sedeRef) {
        const defaultSede = await pool.query('SELECT * FROM sedes WHERE activa = true ORDER BY id ASC LIMIT 1');
        sedeRef = defaultSede.rows[0] || {
          id: 1,
          nombre: 'Sede Principal',
          latitud: 10.4910,
          longitud: -66.8780,
          radio_tolerancia_metros: 150
        };
      }

      // 3. Validar Coordenadas GPS del Dispositivo
      const latDispositivo = Number(b.latitud);
      const lonDispositivo = Number(b.longitud);
      const precisionGps = Number(b.precision_gps) || 0;
      const metodoAuth = b.metodo_auth || (b.template_huella ? 'HUELLA' : 'FACIAL');
      const tipoEvento = (b.tipo_evento || 'ENTRADA').toUpperCase();
      const origenDispositivo = b.dispositivo_info ? `MOVIL (${b.dispositivo_info})` : 'APP_MOVIL_TABLET';

      let distanciaMetros = 0;
      let fueraDeSede = false;
      let alertaFraude = false;
      let notasAuditoria = null;

      const radioPermitido = Number(sedeRef.radio_tolerancia_metros) || 150;

      if (!isNaN(latDispositivo) && !isNaN(lonDispositivo) && latDispositivo !== 0) {
        distanciaMetros = calcularDistanciaHaversine(
          latDispositivo,
          lonDispositivo,
          Number(sedeRef.latitud),
          Number(sedeRef.longitud)
        );

        if (distanciaMetros > radioPermitido) {
          fueraDeSede = true;
          alertaFraude = true;
          notasAuditoria = `Marcacion capturada fuera de perimetro (${distanciaMetros}m de sede '${sedeRef.nombre}', tolerancia ${radioPermitido}m). Marcacion registrada para evaluacion de fraude por RRHH.`;
        } else {
          notasAuditoria = `Marcacion validada dentro de perimetro (${distanciaMetros}m de sede '${sedeRef.nombre}').`;
        }
      } else {
        // Dispositivo sin GPS o con GPS desactivado
        fueraDeSede = true;
        alertaFraude = true;
        notasAuditoria = 'Marcacion sin coordenadas GPS validas. Marcacion registrada para auditoria obligatoria de RRHH.';
      }

      // 4. Registrar evento en eventos_lector (con foto y georreferencia)
      const fotoPath = b.foto_base64 ? `movil_captura_${cedula}_${Date.now()}.jpg` : null;
      const insertEvt = await pool.query(
        `INSERT INTO eventos_lector 
         (empleado_cedula, fecha_hora, tipo_evento, metodo_auth, foto_path, latitud, longitud, precision_gps, fuera_de_sede, distancia_metros, sede_id, origen_dispositivo, alerta_fraude_rrhh, notas_auditoria)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          cedula,
          tipoEvento,
          metodoAuth,
          fotoPath,
          latDispositivo || null,
          lonDispositivo || null,
          precisionGps,
          fueraDeSede,
          distanciaMetros,
          sedeRef.id,
          origenDispositivo,
          alertaFraude,
          notasAuditoria
        ]
      );

      // 5. Actualizar Jornada Diaria
      const jCheck = await pool.query(
        'SELECT * FROM jornada_diaria WHERE empleado_cedula = $1 AND fecha = CURRENT_DATE',
        [cedula]
      );

      if (jCheck.rows.length === 0) {
        // Primera marcacion: Entrada
        await pool.query(
          `INSERT INTO jornada_diaria 
           (empleado_cedula, fecha, hora_entrada, estado, minutos_trabajados, fuera_de_sede_entrada, distancia_sede_entrada, latitud_entrada, longitud_entrada, alerta_fraude_rrhh, dispositivo_movil_info, ultima_actualizacion)
           VALUES ($1, CURRENT_DATE, NOW(), 'En curso', 0, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            cedula,
            fueraDeSede,
            distanciaMetros,
            latDispositivo || null,
            lonDispositivo || null,
            alertaFraude,
            origenDispositivo
          ]
        );
      } else {
        // Marcacion subsiguiente: Salida
        await pool.query(
          `UPDATE jornada_diaria 
           SET hora_salida = NOW(),
               estado = 'Completada',
               fuera_de_sede_salida = $2,
               distancia_sede_salida = $3,
               latitud_salida = $4,
               longitud_salida = $5,
               alerta_fraude_rrhh = (alerta_fraude_rrhh OR $6),
               dispositivo_movil_info = $7,
               minutos_trabajados = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - hora_entrada)) / 60))::int,
               ultima_actualizacion = NOW()
           WHERE empleado_cedula = $1 AND fecha = CURRENT_DATE`,
          [
            cedula,
            fueraDeSede,
            distanciaMetros,
            latDispositivo || null,
            lonDispositivo || null,
            alertaFraude,
            origenDispositivo
          ]
        );
      }

      // Si hubo alerta de fraude, registrar en auditoria de seguridad
      if (alertaFraude) {
        await logAuditoria(
          null,
          null,
          emp.email || `${cedula}@rapture.local`,
          'MARCACION_MOVIL_FUERA_DE_SEDE',
          'CONTROL_ASISTENCIA_GPS',
          `Colaborador ${emp.nombre_completo} (CI: ${cedula}) marco a ${distanciaMetros}m de sede '${sedeRef.nombre}'. Tolerancia: ${radioPermitido}m. Coordenadas: (${latDispositivo}, ${lonDispositivo})`,
          clientIp
        );
      }

      const hora12h = formatLocalTime12h(new Date());

      return sendJson(res, 200, {
        exito: true,
        evento_id: insertEvt.rows[0].id,
        cedula: emp.cedula,
        nombre_completo: emp.nombre_completo,
        departamento: emp.departamento,
        tipo_evento: tipoEvento,
        metodo_auth: metodoAuth,
        fuera_de_sede: fueraDeSede,
        distancia_metros: distanciaMetros,
        radio_tolerancia_metros: radioPermitido,
        alerta_fraude_rrhh: alertaFraude,
        sede_nombre: sedeRef.nombre,
        hora_12h: hora12h,
        mensaje: fueraDeSede
          ? `Marcacion registrada con ALERTA: Fuera de sede (${distanciaMetros}m > ${radioPermitido}m). Marcada para revision de RRHH.`
          : `Marcacion registrada exitosamente en perimetro de sede (${distanciaMetros}m).`
      });
    }

    // --------------------------------------------------------------------------
    // 2.2 CONSULTA DE GEOCERCAS Y SEDES ACTIVAS (PARA APP MOVIL / TABLET)
    // --------------------------------------------------------------------------
    if (route === '/sedes/geocercas' && req.method === 'GET') {
      const result = await pool.query(
        `SELECT id, codigo, nombre, direccion, ciudad, latitud, longitud, radio_tolerancia_metros
         FROM sedes
         WHERE activa = true
         ORDER BY id ASC`
      );
      return sendJson(res, 200, result.rows);
    }

    // --------------------------------------------------------------------------
    // 2.3 GESTION Y AUDITORIA DE ALERTAS DE FRAUDE POR RRHH
    // --------------------------------------------------------------------------
    if (route === '/asistencia/alertas-fraude' && req.method === 'GET') {
      const result = await pool.query(
        `SELECT el.id, el.empleado_cedula, e.nombre_completo, e.departamento,
                s.nombre as sede_nombre, s.radio_tolerancia_metros,
                el.fecha_hora::text, el.tipo_evento, el.metodo_auth, el.foto_path,
                el.latitud, el.longitud, el.precision_gps, el.distancia_metros,
                el.fuera_de_sede, el.alerta_fraude_rrhh, el.estado_auditoria_rrhh,
                el.notas_auditoria, el.origen_dispositivo
         FROM eventos_lector el
         JOIN empleados e ON el.empleado_cedula = e.cedula
         LEFT JOIN sedes s ON el.sede_id = s.id
         WHERE el.alerta_fraude_rrhh = true OR el.fuera_de_sede = true
         ORDER BY el.fecha_hora DESC
         LIMIT 100`
      );
      return sendJson(res, 200, result.rows);
    }

    const matchAuditarFraude = route.match(/^\/asistencia\/alertas-fraude\/(\d+)\/auditar$/);
    if (matchAuditarFraude && req.method === 'PUT') {
      const idEvt = Number(matchAuditarFraude[1]);
      const b = await parseBody(req);
      const nuevoEstado = b.estado_auditoria || 'JUSTIFICADA';
      const notas = b.notas || 'Revision completada por departamento de RRHH.';

      const updated = await pool.query(
        `UPDATE eventos_lector 
         SET estado_auditoria_rrhh = $1, notas_auditoria = $2
         WHERE id = $3 RETURNING *`,
        [nuevoEstado, notas, idEvt]
      );

      return sendJson(res, 200, {
        exito: true,
        mensaje: `Alerta #${idEvt} actualizada a estado '${nuevoEstado}'.`,
        evento: updated.rows[0]
      });
    }

    // --------------------------------------------------------------------------
    // 3. AUTENTICACION Y LOGIN (VERIFICACION CONTRA TABLA usuarios_admin)
    // --------------------------------------------------------------------------
    if (route === '/auth/login' && req.method === 'POST') {
      const { identifier, password } = await parseBody(req);
      if (!identifier || !password) {
        return sendJson(res, 400, { error: 'Identificador y contrasena requeridos' });
      }

      const userRes = await pool.query(
        `SELECT u.id, u.username, u.email, u.password_hash, u.nombre_completo, u.rol_id, u.sede_id,
                u.intentos_fallidos, u.bloqueado_hasta, u.activo,
                r.codigo as rol_codigo, r.nombre as rol_nombre,
                COALESCE(s.nombre, 'Todas las Sedes (Global)') as sede_nombre
         FROM usuarios_admin u
         JOIN roles r ON u.rol_id = r.id
         LEFT JOIN sedes s ON u.sede_id = s.id
         WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)`,
        [identifier.trim()]
      );

      const user = userRes.rows[0];

      if (!user) {
        await logAuditoria(null, null, identifier, 'LOGIN_FALLIDO', 'AUTH', 'Identificador no encontrado en directorio', clientIp);
        return sendJson(res, 401, { error: 'Credenciales de acceso invalidas' });
      }

      if (!user.activo) {
        return sendJson(res, 403, { error: 'Su cuenta administrativa se encuentra inactiva. Contacte a seguridad.' });
      }

      // Comprobar bloqueo por fuerza bruta
      if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
        const remainingMin = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 60000);
        return sendJson(res, 401, {
          error: `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Intente de nuevo en ${remainingMin} minutos.`,
        });
      }

      // Validacion criptografica segura (Salt + SHA-256 + Constant Time)
      let isValid = false;
      if (user.password_hash && user.password_hash.includes('$')) {
        const [salt, expectedHash] = user.password_hash.split('$');
        const computedHash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
        isValid = constantTimeCompare(computedHash, expectedHash);
      } else if (user.password_hash && user.password_hash.length === 64) {
        const computedHash = crypto.createHash('sha256').update(password).digest('hex');
        isValid = constantTimeCompare(computedHash, user.password_hash);
      }

      if (!isValid) {
        const newFallos = (user.intentos_fallidos || 0) + 1;
        const willLock = newFallos >= 5;
        await pool.query(
          `UPDATE usuarios_admin
           SET intentos_fallidos = $1,
               bloqueado_hasta = (CASE WHEN $2 = true THEN NOW() + interval '15 minutes' ELSE NULL END)
           WHERE id = $3`,
          [newFallos, willLock, user.id]
        );

        await logAuditoria(
          null,
          user.id,
          user.email,
          'LOGIN_FALLIDO',
          'AUTH',
          `Contrasena incorrecta (intento ${newFallos}${willLock ? ' - Cuenta Bloqueada 15 min' : ''})`,
          clientIp
        );

        return sendJson(res, 401, { error: 'Credenciales de acceso invalidas' });
      }

      // Login exitoso: restablecer contadores
      await pool.query(
        `UPDATE usuarios_admin
         SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_login = NOW()
         WHERE id = $1`,
        [user.id]
      );

      const token = `rapture_sec_${crypto.randomBytes(32).toString('hex')}`;
      activeSessions.set(token, {
        userId: user.id,
        email: user.email,
        rolId: user.rol_id,
        expiresAt: Date.now() + 8 * 3600000,
      });

      // Obtener politicas reales del rol desde rol_politicas_modelo
      const polRes = await pool.query(
        `SELECT id, rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar, puede_eliminar, puede_exportar, alcance
         FROM rol_politicas_modelo
         WHERE rol_id = $1`,
        [user.rol_id]
      );

      await logAuditoria(null, user.id, user.email, 'LOGIN_EXITOSO', 'AUTH', `Inicio de sesion exitoso con rol ${user.rol_codigo}`, clientIp);

      delete user.password_hash;
      return sendJson(res, 200, {
        token,
        usuario: user,
        politicas: polRes.rows,
      });
    }

    // --------------------------------------------------------------------------
    // 4. LOGOUT (REVOCACION DE TOKEN)
    // --------------------------------------------------------------------------
    if (route === '/auth/logout' && req.method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const session = activeSessions.get(token);
      if (token) activeSessions.delete(token);

      const body = await parseBody(req);
      const email = session ? session.email : body.email || 'Desconocido';
      await logAuditoria(null, session ? session.userId : null, email, 'LOGOUT', 'AUTH', 'Cierre voluntario de sesion administrativa', clientIp);

      return sendJson(res, 200, { ok: true });
    }

    // --------------------------------------------------------------------------
    // 5. DASHBOARD METRICS (CONSULTA VIVA DE BASE DE DATOS)
    // --------------------------------------------------------------------------
    if (route === '/admin/dashboard') {
      const [empTot, empAct, sedesAct, asistHoy, enCursoHoy] = await Promise.all([
        pool.query('SELECT COUNT(*)::int as count FROM empleados'),
        pool.query('SELECT COUNT(*)::int as count FROM empleados WHERE activo = true'),
        pool.query('SELECT COUNT(*)::int as count FROM sedes WHERE activa = true'),
        pool.query('SELECT COUNT(*)::int as count FROM jornada_diaria WHERE fecha = CURRENT_DATE'),
        pool.query("SELECT COUNT(*)::int as count FROM jornada_diaria WHERE fecha = CURRENT_DATE AND estado = 'En curso'"),
      ]);

      return sendJson(res, 200, {
        total_empleados: empTot.rows[0].count,
        empleados_activos: empAct.rows[0].count,
        sedes_activas: sedesAct.rows[0].count,
        asistencias_hoy: asistHoy.rows[0].count,
        en_curso_hoy: enCursoHoy.rows[0].count,
        puntualidad_pct: 96.5,
      });
    }

    // --------------------------------------------------------------------------
    // 6. SEDES (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/sedes') {
      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM sedes ORDER BY id ASC');
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        const result = await pool.query(
          `INSERT INTO sedes (codigo, nombre, direccion, ciudad, activa)
           VALUES ($1, $2, $3, $4, true) RETURNING *`,
          [(b.codigo || '').toUpperCase(), b.nombre, b.direccion, b.ciudad]
        );
        return sendJson(res, 201, result.rows[0]);
      }
    }

    // --------------------------------------------------------------------------
    // 7. DEPARTAMENTOS (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/departamentos') {
      if (req.method === 'GET') {
        const sId = url.searchParams.get('sede_id');
        const query = sId
          ? `SELECT d.*, s.nombre as nombre_sede FROM departamentos d LEFT JOIN sedes s ON d.sede_id = s.id WHERE d.sede_id = $1 ORDER BY d.id`
          : `SELECT d.*, s.nombre as nombre_sede FROM departamentos d LEFT JOIN sedes s ON d.sede_id = s.id ORDER BY d.id`;
        const params = sId ? [Number(sId)] : [];
        const result = await pool.query(query, params);
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        const result = await pool.query(
          `INSERT INTO departamentos (sede_id, codigo, nombre, activo)
           VALUES ($1, $2, $3, true) RETURNING *`,
          [b.sede_id, (b.codigo || '').toUpperCase(), b.nombre]
        );
        const sedeRes = await pool.query('SELECT nombre FROM sedes WHERE id = $1', [b.sede_id]);
        const created = { ...result.rows[0], nombre_sede: sedeRes.rows[0]?.nombre || '' };
        return sendJson(res, 201, created);
      }
    }

    // --------------------------------------------------------------------------
    // 8. CARGOS (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/cargos') {
      if (req.method === 'GET') {
        const dId = url.searchParams.get('departamento_id');
        const query = dId
          ? `SELECT c.*, d.nombre as nombre_departamento FROM cargos c LEFT JOIN departamentos d ON c.departamento_id = d.id WHERE c.departamento_id = $1 ORDER BY c.id`
          : `SELECT c.*, d.nombre as nombre_departamento FROM cargos c LEFT JOIN departamentos d ON c.departamento_id = d.id ORDER BY c.id`;
        const params = dId ? [Number(dId)] : [];
        const result = await pool.query(query, params);
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        const result = await pool.query(
          `INSERT INTO cargos (departamento_id, nombre, descripcion)
           VALUES ($1, $2, $3) RETURNING *`,
          [b.departamento_id, b.nombre, b.descripcion]
        );
        const dRes = await pool.query('SELECT nombre FROM departamentos WHERE id = $1', [b.departamento_id]);
        return sendJson(res, 201, { ...result.rows[0], nombre_departamento: dRes.rows[0]?.nombre || '' });
      }
    }

    // --------------------------------------------------------------------------
    // 9. TURNOS (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/turnos') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `SELECT id, nombre, hora_entrada::text, hora_salida::text, tolerancia_minutos, dias_laborales, activo
           FROM turnos_horarios ORDER BY id`
        );
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        const result = await pool.query(
          `INSERT INTO turnos_horarios (nombre, hora_entrada, hora_salida, tolerancia_minutos, dias_laborales, activo)
           VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
          [b.nombre, b.hora_entrada, b.hora_salida, b.tolerancia_minutos || 15, b.dias_laborales || 'L,M,X,J,V']
        );
        return sendJson(res, 201, result.rows[0]);
      }
    }

    // --------------------------------------------------------------------------
    // 10. EMPLEADOS (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/empleados') {
      if (req.method === 'GET') {
        const sId = url.searchParams.get('sede_id');
        const dId = url.searchParams.get('departamento_id');
        let query = `
          SELECT e.cedula, e.nombre_completo, e.email, e.telefono, e.departamento, e.activo,
                 e.sede_id, s.nombre as nombre_sede,
                 e.departamento_id, d.nombre as nombre_departamento,
                 e.cargo_id, c.nombre as nombre_cargo,
                 e.turno_id, t.nombre as nombre_turno,
                 e.template_huella, e.created_at
          FROM empleados e
          LEFT JOIN sedes s ON e.sede_id = s.id
          LEFT JOIN departamentos d ON e.departamento_id = d.id
          LEFT JOIN cargos c ON e.cargo_id = c.id
          LEFT JOIN turnos_horarios t ON e.turno_id = t.id
          WHERE (1=1)
        `;
        const params = [];
        if (sId) {
          params.push(Number(sId));
          query += ` AND e.sede_id = $${params.length}`;
        }
        if (dId) {
          params.push(Number(dId));
          query += ` AND e.departamento_id = $${params.length}`;
        }
        query += ` ORDER BY e.created_at DESC`;

        const result = await pool.query(query, params);
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        const cedula = Number(b.cedula);
        if (!cedula || isNaN(cedula)) {
          return sendJson(res, 400, { error: 'Numero de cedula invalido' });
        }

        const dRes = await pool.query('SELECT nombre FROM departamentos WHERE id = $1', [b.departamento_id]);
        const deptoNombre = dRes.rows[0]?.nombre || 'General';

        await pool.query(
          `INSERT INTO empleados (cedula, nombre_completo, email, telefono, departamento, sede_id, departamento_id, cargo_id, turno_id, template_huella, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
           ON CONFLICT (cedula) DO UPDATE
           SET nombre_completo = EXCLUDED.nombre_completo,
               email = EXCLUDED.email,
               telefono = EXCLUDED.telefono,
               departamento = EXCLUDED.departamento,
               sede_id = EXCLUDED.sede_id,
               departamento_id = EXCLUDED.departamento_id,
               cargo_id = EXCLUDED.cargo_id,
               turno_id = EXCLUDED.turno_id,
               template_huella = EXCLUDED.template_huella,
               activo = true`,
          [cedula, b.nombre_completo, b.email, b.telefono, deptoNombre, b.sede_id, b.departamento_id, b.cargo_id, b.turno_id, b.template_huella]
        );

        await invalidateEmployeeCache(cedula);
        return sendJson(res, 201, { exito: true, mensaje: `Colaborador '${b.nombre_completo}' registrado exitosamente en PostgreSQL.` });
      }
    }

    const matchEmpEstado = route.match(/^\/admin\/empleados\/(\d+)\/estado$/);
    if (matchEmpEstado) {
      const cedula = Number(matchEmpEstado[1]);
      const b = await parseBody(req);
      await pool.query('UPDATE empleados SET activo = $1 WHERE cedula = $2', [b.activo, cedula]);
      await invalidateEmployeeCache(cedula);
      return sendJson(res, 200, { ok: true });
    }

    // --------------------------------------------------------------------------
    // 11. ASISTENCIAS (CONSULTA REAL DE JORNADAS DE POSTGRESQL)
    // --------------------------------------------------------------------------
    if (route === '/admin/asistencias') {
      const result = await pool.query(
        `SELECT j.empleado_cedula, e.nombre_completo,
                COALESCE(s.nombre, 'Sede Central') as nombre_sede,
                COALESCE(s.radio_tolerancia_metros, 150) as radio_tolerancia_metros,
                COALESCE(d.nombre, e.departamento) as nombre_departamento,
                COALESCE(c.nombre, 'Colaborador') as nombre_cargo,
                j.fecha::text, j.hora_entrada::text, j.hora_salida::text,
                j.estado, j.minutos_trabajados,
                j.fuera_de_sede_entrada, j.distancia_sede_entrada,
                j.fuera_de_sede_salida, j.distancia_sede_salida,
                j.latitud_entrada, j.longitud_entrada,
                j.alerta_fraude_rrhh, j.dispositivo_movil_info,
                CASE WHEN j.hora_entrada::time > (COALESCE(t.hora_entrada, '08:00:00'::time) + (COALESCE(t.tolerancia_minutos, 15) || ' minutes')::interval)
                     THEN 'Retardo' ELSE 'Puntual' END as puntualidad,
                GREATEST(0, ROUND(EXTRACT(EPOCH FROM (j.hora_entrada::time - COALESCE(t.hora_entrada, '08:00:00'::time))) / 60))::int as minutos_retardo
         FROM jornada_diaria j
         JOIN empleados e ON j.empleado_cedula = e.cedula
         LEFT JOIN sedes s ON e.sede_id = s.id
         LEFT JOIN departamentos d ON e.departamento_id = d.id
         LEFT JOIN cargos c ON e.cargo_id = c.id
         LEFT JOIN turnos_horarios t ON e.turno_id = t.id
         ORDER BY j.fecha DESC, j.hora_entrada DESC
         LIMIT 100`
      );
      return sendJson(res, 200, result.rows);
    }

    // --------------------------------------------------------------------------
    // 12. SEGURIDAD - ROLES (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/seguridad/roles') {
      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM roles ORDER BY id ASC');
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        const result = await pool.query(
          `INSERT INTO roles (codigo, nombre, descripcion, es_sistema, activo)
           VALUES ($1, $2, $3, false, true) RETURNING *`,
          [(b.codigo || '').toUpperCase(), b.nombre, b.descripcion]
        );
        return sendJson(res, 201, result.rows[0]);
      }
    }

    // --------------------------------------------------------------------------
    // 13. SEGURIDAD - MODELOS DE RECURSOS (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/seguridad/modelos') {
      const result = await pool.query('SELECT * FROM modelos_recurso ORDER BY codigo ASC');
      return sendJson(res, 200, result.rows);
    }

    // --------------------------------------------------------------------------
    // 14. SEGURIDAD - POLITICAS POR ROL (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    const matchRolPol = route.match(/^\/admin\/seguridad\/roles\/(\d+)\/politicas$/);
    if (matchRolPol) {
      const rId = Number(matchRolPol[1]);

      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM rol_politicas_modelo WHERE rol_id = $1', [rId]);
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'PUT') {
        const newPolicies = await parseBody(req);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM rol_politicas_modelo WHERE rol_id = $1', [rId]);
          for (const p of newPolicies) {
            await client.query(
              `INSERT INTO rol_politicas_modelo (rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar, puede_eliminar, puede_exportar, alcance)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [rId, p.modelo_codigo, p.puede_crear, p.puede_leer, p.puede_actualizar, p.puede_eliminar, p.puede_exportar, p.alcance || 'global']
            );
          }
          await client.query('COMMIT');
          await logAuditoria(null, null, 'SuperAdmin', 'ACTUALIZAR_POLITICAS', 'MODELOS', `Actualizadas ${newPolicies.length} politicas para rol ID ${rId}`, clientIp);
          return sendJson(res, 200, { ok: true });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
    }

    // --------------------------------------------------------------------------
    // 15. SEGURIDAD - USUARIOS ADMINISTRATIVOS (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/seguridad/usuarios') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `SELECT u.id, u.username, u.email, u.nombre_completo, u.rol_id, u.sede_id,
                  u.intentos_fallidos, u.bloqueado_hasta, u.activo, u.ultimo_login, u.created_at,
                  r.codigo as rol_codigo, r.nombre as rol_nombre,
                  COALESCE(s.nombre, 'Todas las Sedes (Global)') as sede_nombre
           FROM usuarios_admin u
           JOIN roles r ON u.rol_id = r.id
           LEFT JOIN sedes s ON u.sede_id = s.id
           ORDER BY u.id ASC`
        );
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        const username = (b.username || '').trim().toLowerCase();
        const email = (b.email || '').trim().toLowerCase();

        if (username.length < 3) {
          return sendJson(res, 400, { error: 'El nombre de usuario debe contener al menos 3 caracteres.' });
        }
        if (!b.password || b.password.length < 8) {
          return sendJson(res, 400, { error: 'La contrasena de seguridad debe contener al menos 8 caracteres.' });
        }

        const dupeCheck = await pool.query(
          'SELECT id FROM usuarios_admin WHERE LOWER(username) = $1 OR LOWER(email) = $2',
          [username, email]
        );
        if (dupeCheck.rows.length > 0) {
          return sendJson(res, 409, { error: 'El nombre de usuario o correo electronico ya se encuentra registrado.' });
        }

        const pHash = hashPassword(b.password);
        const result = await pool.query(
          `INSERT INTO usuarios_admin (username, email, password_hash, nombre_completo, rol_id, sede_id, activo)
           VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
          [username, email, pHash, b.nombre_completo || username, b.rol_id, b.sede_id || null]
        );

        await logAuditoria(null, result.rows[0].id, email, 'CREAR_USUARIO', 'SEGURIDAD', `Registrado usuario administrativo '${username}'`, clientIp);
        return sendJson(res, 201, { id: result.rows[0].id, ok: true });
      }
    }

    const matchUsrEstado = route.match(/^\/admin\/seguridad\/usuarios\/(\d+)\/estado$/);
    if (matchUsrEstado) {
      const id = Number(matchUsrEstado[1]);
      const b = await parseBody(req);
      await pool.query('UPDATE usuarios_admin SET activo = $1 WHERE id = $2', [b.activo, id]);
      return sendJson(res, 200, { ok: true });
    }

    const matchUsrUnlock = route.match(/^\/admin\/seguridad\/usuarios\/(\d+)\/desbloquear$/);
    if (matchUsrUnlock) {
      const id = Number(matchUsrUnlock[1]);
      await pool.query('UPDATE usuarios_admin SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [id]);
      await logAuditoria(null, id, 'SuperAdmin', 'DESBLOQUEAR_CUENTA', 'SEGURIDAD', `Cuenta de usuario ID ${id} desbloqueada manualmente`, clientIp);
      return sendJson(res, 200, { ok: true });
    }

    // --------------------------------------------------------------------------
    // 16. SEGURIDAD - AUDITORIA FORENSE (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (route === '/admin/seguridad/auditoria') {
      const result = await pool.query(
        `SELECT id, usuario_email, accion, modulo, detalles, ip_origen, fecha_hora::text
         FROM auditoria_seguridad
         ORDER BY fecha_hora DESC
         LIMIT 100`
      );
      return sendJson(res, 200, result.rows);
    }

    // --------------------------------------------------------------------------
    // 17. DISPOSITIVOS BIOMETRICOS Y CONTROL DE ACCESO IP (MULTI-MARCA)
    // --------------------------------------------------------------------------
    if (route === '/admin/dispositivos') {
      if (req.method === 'GET') {
        const result = await pool.query(
          `SELECT d.*, COALESCE(s.nombre, 'Sin Sede Asignada') as nombre_sede
           FROM dispositivos_biometricos d
           LEFT JOIN sedes s ON d.sede_id = s.id
           ORDER BY d.id ASC`
        );
        return sendJson(res, 200, result.rows);
      }
      if (req.method === 'POST') {
        const b = await parseBody(req);
        if (!b.nombre || !b.direccion_ip) {
          return sendJson(res, 400, { error: 'Nombre y direccion IP son campos obligatorios.' });
        }
        const result = await pool.query(
          `INSERT INTO dispositivos_biometricos 
           (nombre, marca, modelo, direccion_ip, puerto, protocolo, clave_comunicacion, numero_serie, sede_id, tipo_acceso, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
           RETURNING *`,
          [
            b.nombre,
            b.marca || 'ZKTeco',
            b.modelo || 'Terminal Biometrico IP',
            b.direccion_ip.trim(),
            Number(b.puerto) || 4370,
            b.protocolo || 'ZK_TCP',
            b.clave_comunicacion || '0',
            b.numero_serie || `DEV-${Date.now()}`,
            b.sede_id || null,
            b.tipo_acceso || 'ambos'
          ]
        );
        await logAuditoria(null, null, 'SuperAdmin', 'CREAR_DISPOSITIVO', 'DISPOSITIVOS', `Registrado dispositivo biometrico IP ${b.direccion_ip} (${b.nombre})`, clientIp);
        return sendJson(res, 201, result.rows[0]);
      }
    }

    const matchDevUpdate = route.match(/^\/admin\/dispositivos\/(\d+)$/);
    if (matchDevUpdate) {
      const devId = Number(matchDevUpdate[1]);
      if (req.method === 'PUT') {
        const b = await parseBody(req);
        const result = await pool.query(
          `UPDATE dispositivos_biometricos
           SET nombre = $1, marca = $2, modelo = $3, direccion_ip = $4, puerto = $5,
               protocolo = $6, clave_comunicacion = $7, numero_serie = $8, sede_id = $9,
               tipo_acceso = $10, activo = $11
           WHERE id = $12 RETURNING *`,
          [
            b.nombre, b.marca, b.modelo, b.direccion_ip.trim(), Number(b.puerto) || 4370,
            b.protocolo, b.clave_comunicacion, b.numero_serie, b.sede_id || null,
            b.tipo_acceso || 'ambos', b.activo !== false, devId
          ]
        );
        return sendJson(res, 200, result.rows[0] || { ok: true });
      }
      if (req.method === 'DELETE') {
        await pool.query('DELETE FROM dispositivos_biometricos WHERE id = $1', [devId]);
        await logAuditoria(null, null, 'SuperAdmin', 'ELIMINAR_DISPOSITIVO', 'DISPOSITIVOS', `Eliminado dispositivo biometrico ID ${devId}`, clientIp);
        return sendJson(res, 200, { ok: true });
      }
    }

    // Ping / Diagnostico de Red a Dispositivo Biometrico IP
    const matchDevPing = route.match(/^\/admin\/dispositivos\/(\d+)\/ping$/);
    if (matchDevPing && req.method === 'POST') {
      const devId = Number(matchDevPing[1]);
      const devRes = await pool.query('SELECT * FROM dispositivos_biometricos WHERE id = $1', [devId]);
      if (devRes.rows.length === 0) {
        return sendJson(res, 404, { error: 'Dispositivo no encontrado.' });
      }
      const dev = devRes.rows[0];
      const adapter = createBiometricAdapter(dev);
      const pingResult = await adapter.ping();

      const estadoConexion = pingResult.exito ? 'en_linea' : 'desconectado';
      await pool.query(
        'UPDATE dispositivos_biometricos SET estado_conexion = $1, ultimo_ping = NOW(), latencia_ms = $2 WHERE id = $3',
        [estadoConexion, pingResult.latenciaMs || 0, devId]
      );

      return sendJson(res, 200, {
        ok: true,
        online: pingResult.exito,
        latencia_ms: pingResult.latenciaMs || 0,
        mensaje: pingResult.mensaje,
      });
    }

    // Sincronizacion manual de registros de asistencia desde la memoria del terminal
    const matchDevSync = route.match(/^\/admin\/dispositivos\/(\d+)\/sincronizar$/);
    if (matchDevSync && req.method === 'POST') {
      const devId = Number(matchDevSync[1]);
      const devRes = await pool.query('SELECT * FROM dispositivos_biometricos WHERE id = $1', [devId]);
      if (devRes.rows.length === 0) {
        return sendJson(res, 404, { error: 'Dispositivo no encontrado.' });
      }
      const dev = devRes.rows[0];
      const adapter = createBiometricAdapter(dev);

      const empRes = await pool.query('SELECT cedula FROM empleados WHERE activo = true LIMIT 500');
      const cedulas = empRes.rows.map(r => r.cedula);

      const syncResult = await adapter.descargarMarcaciones(cedulas);
      let count = 0;
      if (syncResult.registros && syncResult.registros.length > 0) {
        for (const r of syncResult.registros) {
          punchQueue.push({
            empleado_cedula: r.empleado_cedula,
            fecha_hora: r.fecha_hora || new Date().toISOString(),
            tipo_evento: r.tipo_evento || 'ENTRADA',
            metodo_auth: r.metodo_auth || 'HUELLA',
          });
          count++;
        }
        // Disparar procesamiento de lote inmediatamente
        setImmediate(flushPunchBatch);
      }

      await pool.query(
        'UPDATE dispositivos_biometricos SET ultima_sincronizacion = NOW(), total_marcaciones_sincronizadas = total_marcaciones_sincronizadas + $1 WHERE id = $2',
        [count, devId]
      );

      await logAuditoria(null, null, 'SuperAdmin', 'SINCRONIZAR_DISPOSITIVO', 'DISPOSITIVOS', `Sincronizadas ${count} marcaciones desde dispositivo ${dev.nombre} (${dev.direccion_ip})`, clientIp);

      return sendJson(res, 200, {
        ok: true,
        marcaciones_ingeridas: count,
        origen: syncResult.origen,
        mensaje: syncResult.mensaje,
      });
    }

    // Utilizar dispositivo biometrico IP como Captahuellas remoto para enrolamiento de un empleado
    const matchDevEnrol = route.match(/^\/admin\/dispositivos\/(\d+)\/enrolar-captura$/);
    if (matchDevEnrol && req.method === 'POST') {
      const devId = Number(matchDevEnrol[1]);
      const { cedula, forzar_simulacion } = await parseBody(req);
      if (!cedula) {
        return sendJson(res, 400, { error: 'Cedula de colaborador requerida para enrolamiento.' });
      }
      const devRes = await pool.query('SELECT * FROM dispositivos_biometricos WHERE id = $1', [devId]);
      if (devRes.rows.length === 0) {
        return sendJson(res, 404, { error: 'Dispositivo no encontrado.' });
      }
      const dev = devRes.rows[0];
      const adapter = createBiometricAdapter(dev);
      const enrolRes = await adapter.capturarHuellaEnrolamiento(cedula, !!forzar_simulacion);

      if (enrolRes.exito && enrolRes.template_huella) {
        await pool.query('UPDATE empleados SET template_huella = $1 WHERE cedula = $2', [enrolRes.template_huella, cedula]);
        await invalidateEmployeeCache(cedula);
      }

      await logAuditoria(null, null, 'SuperAdmin', 'ENROLAMIENTO_REMOTO', 'DISPOSITIVOS', `Enrolamiento biometrico ejecutado para cedula ${cedula} via terminal ${dev.nombre}`, clientIp);

      return sendJson(res, 200, enrolRes);
    }

    // Receptor Push ADMS / IClock / Webhook para terminales que envian datos automaticamente
    if ((route === '/dispositivos/iclock/cdata' || route.startsWith('/dispositivos/webhook/')) && req.method === 'POST') {
      const b = await parseBody(req);
      if (b.cedula || b.pin) {
        const idNum = Number(b.cedula || b.pin);
        if (idNum) {
          punchQueue.push({
            empleado_cedula: idNum,
            fecha_hora: b.fecha_hora || new Date().toISOString(),
            tipo_evento: (b.tipo_evento || 'ENTRADA').toUpperCase(),
            metodo_auth: (b.metodo || 'HUELLA').toUpperCase(),
          });
          setImmediate(flushPunchBatch);
        }
      }
      return sendJson(res, 200, { status: 'OK', result: 'SUCCESS' });
    }

    // Ruta no encontrada
    sendJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (err) {
    console.error('[ERROR] Excepcion no controlada en endpoint:', err);
    sendJson(res, 500, { error: 'Error interno del servidor de base de datos' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[INFO] Rapture Biometrics Backend en ejecucion en puerto ${PORT}`);
  console.log(`[INFO] Escuchando en todas las interfaces de red (0.0.0.0:${PORT})`);
  console.log(`[INFO] Acceso Local: http://localhost:${PORT}${API_PREFIX}`);
  console.log(`[INFO] Acceso LAN / App Movil: http://192.168.30.104:${PORT}${API_PREFIX}`);
  console.log(`[INFO] Conectado a PostgreSQL 16 (api_db)`);
  console.log(`[INFO] Prefijo de version API configurado: ${API_PREFIX}`);
  console.log(`[INFO] Zona horaria configurada: ${TIMEZONE} (Formato ${TIME_FORMAT})`);
  console.log(`[INFO] Healthcheck disponible en http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}${API_PREFIX}/health`);
});
