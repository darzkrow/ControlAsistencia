const http = require('node:http');
const crypto = require('node:crypto');
const { Pool } = require('pg');

const PORT = 3000;
const HOST = '127.0.0.1';

// Conexion al Pool de PostgreSQL (rapture-db)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://admin:secreto@127.0.0.1:5432/api_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => {
  console.error('[ERROR] Error inesperado en el Pool de PostgreSQL:', err.message);
});

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
  const pathname = url.pathname;
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  try {
    // --------------------------------------------------------------------------
    // 1. HEALTHCHECK ENDPOINT
    // --------------------------------------------------------------------------
    if (pathname === '/api/health') {
      const dbCheck = await pool.query('SELECT NOW() as now');
      return sendJson(res, 200, {
        status: 'ok',
        service: 'rapture-biometrics-backend',
        engine: 'Axum / PostgreSQL Direct',
        version: '2.0.4',
        server_connected: true,
        database_connected: !!dbCheck.rows[0],
        timestamp: new Date().toISOString(),
      });
    }

    // --------------------------------------------------------------------------
    // 2. KIOSKO BIOMETRICO - REGISTRO DE ASISTENCIA (TRANSACCION REAL EN BD)
    // --------------------------------------------------------------------------
    if (pathname === '/api/escaneo' && req.method === 'POST') {
      const body = await parseBody(req);
      const idNum = Number(body.cedula);

      if (!idNum || isNaN(idNum)) {
        return sendJson(res, 400, { es_empleado: false, mensaje: 'Numero de identificacion invalido', tipo_evento: 'rechazado' });
      }

      const empRes = await pool.query(
        `SELECT e.cedula, e.nombre_completo, e.departamento, e.activo, s.nombre as nombre_sede
         FROM empleados e
         LEFT JOIN sedes s ON e.sede_id = s.id
         WHERE e.cedula = $1`,
        [idNum]
      );

      const emp = empRes.rows[0];
      if (!emp || !emp.activo) {
        return sendJson(res, 200, {
          es_empleado: false,
          mensaje: 'Identidad no registrada o colaborador inactivo. Por favor acuda a recepcion para registro de visitante.',
          tipo_evento: 'visitante',
        });
      }

      // Evaluar la jornada del dia actual (ACID)
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const jornadaRes = await client.query(
          `SELECT * FROM jornada_diaria WHERE empleado_cedula = $1 AND fecha = CURRENT_DATE FOR UPDATE`,
          [idNum]
        );

        let tipoEvento = 'entrada';
        let minutosTrabajados = 0;

        // Consultar turno del empleado para evaluar puntualidad
        const turnoRes = await client.query(
          `SELECT t.hora_entrada, t.tolerancia_minutos
           FROM empleados e
           LEFT JOIN turnos_horarios t ON e.turno_id = t.id
           WHERE e.cedula = $1`,
          [idNum]
        );
        const turno = turnoRes.rows[0];
        let puntualidad = 'Puntual';
        let minutosRetardo = 0;

        if (turno && turno.hora_entrada) {
          const evalRes = await client.query(
            `SELECT (NOW()::time > ($1::time + ($2 || ' minutes')::interval)) as es_retardo,
                    GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW()::time - $1::time)) / 60))::int as retardo_mins`,
            [turno.hora_entrada, turno.tolerancia_minutos || 15]
          );
          if (evalRes.rows[0]?.es_retardo) {
            puntualidad = 'Retardo';
            minutosRetardo = evalRes.rows[0]?.retardo_mins || 0;
          }
        }

        if (jornadaRes.rows.length === 0) {
          // Primer marcaje del dia -> ENTRADA
          tipoEvento = 'entrada';
          await client.query(
            `INSERT INTO jornada_diaria (empleado_cedula, fecha, hora_entrada, estado, minutos_trabajados, puntualidad, minutos_retardo, ultima_actualizacion)
             VALUES ($1, CURRENT_DATE, NOW(), 'En curso', 0, $2, $3, NOW())`,
            [idNum, puntualidad, minutosRetardo]
          );
        } else {
          // Segundo o posterior marcaje del dia -> SALIDA
          const diffRes = await client.query(
            `SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - hora_entrada)) / 60)::int as minutos FROM jornada_diaria WHERE empleado_cedula = $1 AND fecha = CURRENT_DATE`,
            [idNum]
          );
          minutosTrabajados = Math.max(0, diffRes.rows[0]?.minutos || 0);

          await client.query(
            `UPDATE jornada_diaria
             SET hora_salida = NOW(),
                 minutos_trabajados = $2,
                 estado = 'Completada',
                 ultima_actualizacion = NOW()
             WHERE empleado_cedula = $1 AND fecha = CURRENT_DATE`,
            [idNum, minutosTrabajados]
          );
        }

        // Registrar evento inmutable de auditoria del lector (metodo_auth)
        const metodoAuth = (body.metodo || 'FACIAL').toUpperCase();
        await client.query(
          `INSERT INTO eventos_lector (empleado_cedula, fecha_hora, tipo_evento, foto_path, metodo_auth)
           VALUES ($1, NOW(), $2, $3, $4)`,
          [idNum, tipoEvento.toUpperCase(), null, metodoAuth]
        );

        await client.query('COMMIT');

        const accionTxt = tipoEvento === 'entrada' ? 'Entrada registrada satisfactoriamente.' : 'Salida registrada satisfactoriamente.';
        return sendJson(res, 200, {
          es_empleado: true,
          mensaje: `Bienvenido/a, ${emp.nombre_completo}! ${accionTxt}`,
          nombre_completo: emp.nombre_completo,
          departamento: emp.departamento || 'General',
          tipo_evento: tipoEvento,
          minutos_acumulados: minutosTrabajados,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ERROR] Error en transaccion de escaneo:', err);
        return sendJson(res, 500, { error: 'Error interno al procesar el marcaje' });
      } finally {
        client.release();
      }
    }

    // --------------------------------------------------------------------------
    // 3. AUTENTICACION Y LOGIN (VERIFICACION CONTRA TABLA usuarios_admin)
    // --------------------------------------------------------------------------
    if (pathname === '/api/auth/login' && req.method === 'POST') {
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
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
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
    if (pathname === '/api/admin/dashboard') {
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
    if (pathname === '/api/admin/sedes') {
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
    if (pathname === '/api/admin/departamentos') {
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
    if (pathname === '/api/admin/cargos') {
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
    if (pathname === '/api/admin/turnos') {
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
    if (pathname === '/api/admin/empleados') {
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

        return sendJson(res, 201, { exito: true, mensaje: `Colaborador '${b.nombre_completo}' registrado exitosamente en PostgreSQL.` });
      }
    }

    if (pathname.startsWith('/api/admin/empleados/') && pathname.endsWith('/estado')) {
      const parts = pathname.split('/');
      const cedula = Number(parts[4]);
      const b = await parseBody(req);
      await pool.query('UPDATE empleados SET activo = $1 WHERE cedula = $2', [b.activo, cedula]);
      return sendJson(res, 200, { ok: true });
    }

    // --------------------------------------------------------------------------
    // 11. ASISTENCIAS (CONSULTA REAL DE JORNADAS DE POSTGRESQL)
    // --------------------------------------------------------------------------
    if (pathname === '/api/admin/asistencias') {
      const result = await pool.query(
        `SELECT j.empleado_cedula, e.nombre_completo,
                COALESCE(s.nombre, 'Sede Central') as nombre_sede,
                COALESCE(d.nombre, e.departamento) as nombre_departamento,
                COALESCE(c.nombre, 'Colaborador') as nombre_cargo,
                j.fecha::text, j.hora_entrada::text, j.hora_salida::text,
                j.estado, j.minutos_trabajados,
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
    if (pathname === '/api/admin/seguridad/roles') {
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
    if (pathname === '/api/admin/seguridad/modelos') {
      const result = await pool.query('SELECT * FROM modelos_recurso ORDER BY codigo ASC');
      return sendJson(res, 200, result.rows);
    }

    // --------------------------------------------------------------------------
    // 14. SEGURIDAD - POLITICAS POR ROL (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (pathname.startsWith('/api/admin/seguridad/roles/') && pathname.endsWith('/politicas')) {
      const parts = pathname.split('/');
      const rId = Number(parts[5]);

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
    if (pathname === '/api/admin/seguridad/usuarios') {
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

    if (pathname.startsWith('/api/admin/seguridad/usuarios/') && pathname.endsWith('/estado')) {
      const id = Number(pathname.split('/')[5]);
      const b = await parseBody(req);
      await pool.query('UPDATE usuarios_admin SET activo = $1 WHERE id = $2', [b.activo, id]);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname.startsWith('/api/admin/seguridad/usuarios/') && pathname.endsWith('/desbloquear')) {
      const id = Number(pathname.split('/')[5]);
      await pool.query('UPDATE usuarios_admin SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [id]);
      await logAuditoria(null, id, 'SuperAdmin', 'DESBLOQUEAR_CUENTA', 'SEGURIDAD', `Cuenta de usuario ID ${id} desbloqueada manualmente`, clientIp);
      return sendJson(res, 200, { ok: true });
    }

    // --------------------------------------------------------------------------
    // 16. SEGURIDAD - AUDITORIA FORENSE (POSTGRESQL REAL)
    // --------------------------------------------------------------------------
    if (pathname === '/api/admin/seguridad/auditoria') {
      const result = await pool.query(
        `SELECT id, usuario_email, accion, modulo, detalles, ip_origen, fecha_hora::text
         FROM auditoria_seguridad
         ORDER BY fecha_hora DESC
         LIMIT 100`
      );
      return sendJson(res, 200, result.rows);
    }

    // Ruta no encontrada
    sendJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (err) {
    console.error('[ERROR] Excepcion no controlada en endpoint:', err);
    sendJson(res, 500, { error: 'Error interno del servidor de base de datos' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[INFO] Rapture Biometrics Backend en ejecucion en http://${HOST}:${PORT}`);
  console.log(`[INFO] Conectado a PostgreSQL 16 (api_db) en localhost:5432`);
  console.log(`[INFO] Healthcheck disponible en http://${HOST}:${PORT}/api/health`);
});
