use crate::db::entities::AsistenciaReporteEntity;
use chrono::{NaiveDate, NaiveDateTime};
use sqlx::{PgPool, Postgres, Row, Transaction};

pub struct AsistenciaRepository;

#[derive(serde::Serialize)]
pub struct DashboardMetrics {
    pub total_empleados: i64,
    pub empleados_activos: i64,
    pub sedes_activas: i64,
    pub asistencias_hoy: i64,
    pub en_curso_hoy: i64,
    pub puntualidad_pct: f64,
}

impl AsistenciaRepository {
    /// Obtiene la marca temporal del último evento absoluto registrado para un empleado
    pub async fn obtener_ultimo_evento_absoluto(
        pool: &PgPool,
        cedula: i32,
    ) -> Result<Option<NaiveDateTime>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT fecha_hora FROM eventos_lector WHERE empleado_cedula = $1 ORDER BY id DESC LIMIT 1"
        )
        .bind(cedula)
        .fetch_optional(pool)
        .await?;

        Ok(row.and_then(|r| r.try_get("fecha_hora").ok()))
    }

    /// Obtiene el último evento del día actual (CURRENT_DATE) para determinar alternancia
    pub async fn obtener_ultimo_evento_hoy(
        pool: &PgPool,
        cedula: i32,
    ) -> Result<Option<(String, Option<NaiveDateTime>)>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT tipo_evento, fecha_hora 
             FROM eventos_lector 
             WHERE empleado_cedula = $1 AND fecha_hora::date = CURRENT_DATE 
             ORDER BY id DESC LIMIT 1"
        )
        .bind(cedula)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| {
            let tipo: String = r.try_get("tipo_evento").unwrap_or_else(|_| "ENTRADA".to_string());
            let fecha: Option<NaiveDateTime> = r.try_get("fecha_hora").ok();
            (tipo, fecha)
        }))
    }

    /// Inserta evento de auditoría dentro de una transacción activa
    pub async fn insertar_evento(
        tx: &mut Transaction<'_, Postgres>,
        cedula: i32,
        tipo_evento: &str,
        foto_path: Option<&str>,
        metodo_auth: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO eventos_lector (empleado_cedula, tipo_evento, foto_path, metodo_auth) 
             VALUES ($1, $2, $3, $4)"
        )
        .bind(cedula)
        .bind(tipo_evento)
        .bind(foto_path)
        .bind(metodo_auth)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    /// Registra la entrada del colaborador en jornada_diaria evaluando puntualidad contra el turno
    pub async fn registrar_entrada_jornada(
        tx: &mut Transaction<'_, Postgres>,
        cedula: i32,
        foto_path: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        // Consultar el horario del turno asignado al empleado (si tiene turno)
        let turno_info = sqlx::query(
            "SELECT t.hora_entrada, t.tolerancia_minutos 
             FROM empleados e 
             JOIN turnos_horarios t ON t.id = e.turno_id 
             WHERE e.cedula = $1"
        )
        .bind(cedula)
        .fetch_optional(&mut **tx)
        .await?;

        let (puntualidad, minutos_retardo) = match turno_info {
            Some(t) => {
                let hora_esperada: chrono::NaiveTime = t.try_get("hora_entrada")?;
                let tolerancia: i32 = t.try_get("tolerancia_minutos").unwrap_or(15);
                let ahora_time = chrono::Local::now().time();

                let diff_min = (ahora_time - hora_esperada).num_minutes();
                if diff_min > tolerancia as i64 {
                    ("Retardo".to_string(), diff_min as i32)
                } else {
                    ("Puntual".to_string(), 0)
                }
            }
            None => ("Puntual".to_string(), 0),
        };

        sqlx::query(
            "INSERT INTO jornada_diaria (
                empleado_cedula, fecha, hora_entrada, estado, foto_entrada, minutos_trabajados, puntualidad, minutos_retardo, ultima_actualizacion
             ) 
             VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'En curso', $2, 0, $3, $4, CURRENT_TIMESTAMP) 
             ON CONFLICT (empleado_cedula, fecha) 
             DO UPDATE SET 
                estado = 'En curso',
                ultima_actualizacion = CURRENT_TIMESTAMP,
                foto_entrada = COALESCE(jornada_diaria.foto_entrada, EXCLUDED.foto_entrada)"
        )
        .bind(cedula)
        .bind(foto_path)
        .bind(puntualidad)
        .bind(minutos_retardo)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    /// Registra la salida del colaborador y calcula los minutos laborados acumulados
    pub async fn registrar_salida_jornada(
        tx: &mut Transaction<'_, Postgres>,
        cedula: i32,
        foto_path: Option<&str>,
        hora_previa: Option<NaiveDateTime>,
    ) -> Result<Option<i32>, sqlx::Error> {
        let res = if let Some(entrada_anterior) = hora_previa {
            sqlx::query(
                "UPDATE jornada_diaria
                 SET hora_salida = CURRENT_TIMESTAMP,
                     foto_salida = COALESCE($1, foto_salida),
                     estado = 'Completada',
                     minutos_trabajados = minutos_trabajados + GREATEST(0, ROUND(EXTRACT(EPOCH FROM (LOCALTIMESTAMP - $2::timestamp)) / 60)::INTEGER),
                     ultima_actualizacion = CURRENT_TIMESTAMP
                 WHERE empleado_cedula = $3 AND fecha = CURRENT_DATE
                 RETURNING minutos_trabajados"
            )
            .bind(foto_path)
            .bind(entrada_anterior)
            .bind(cedula)
            .fetch_optional(&mut **tx)
            .await?
        } else {
            sqlx::query(
                "UPDATE jornada_diaria
                 SET hora_salida = CURRENT_TIMESTAMP,
                     foto_salida = COALESCE($1, foto_salida),
                     estado = 'Completada',
                     ultima_actualizacion = CURRENT_TIMESTAMP
                 WHERE empleado_cedula = $2 AND fecha = CURRENT_DATE
                 RETURNING minutos_trabajados"
            )
            .bind(foto_path)
            .bind(cedula)
            .fetch_optional(&mut **tx)
            .await?
        };

        Ok(res.and_then(|r| r.try_get::<i32, _>("minutos_trabajados").ok()))
    }

    /// Genera reporte de asistencia con filtros dinámicos por rango de fechas, sede y departamento
    pub async fn generar_reporte(
        pool: &PgPool,
        fecha_desde: Option<NaiveDate>,
        fecha_hasta: Option<NaiveDate>,
        sede_id: Option<i32>,
        departamento_id: Option<i32>,
    ) -> Result<Vec<AsistenciaReporteEntity>, sqlx::Error> {
        let mut sql = String::from(
            "SELECT j.empleado_cedula, e.nombre_completo,
                    s.nombre as nombre_sede, d.nombre as nombre_departamento, c.nombre as nombre_cargo,
                    j.fecha, j.hora_entrada, j.hora_salida, j.estado,
                    j.minutos_trabajados, j.puntualidad, j.minutos_retardo,
                    j.foto_entrada, j.foto_salida
             FROM jornada_diaria j
             JOIN empleados e ON e.cedula = j.empleado_cedula
             LEFT JOIN sedes s ON s.id = e.sede_id
             LEFT JOIN departamentos d ON d.id = e.departamento_id
             LEFT JOIN cargos c ON c.id = e.cargo_id
             WHERE 1=1"
        );

        if fecha_desde.is_some() {
            sql.push_str(" AND j.fecha >= $1");
        } else {
            sql.push_str(" AND j.fecha >= CURRENT_DATE - INTERVAL '30 days'");
        }

        if fecha_hasta.is_some() {
            sql.push_str(" AND j.fecha <= $2");
        }

        if sede_id.is_some() {
            sql.push_str(" AND e.sede_id = $3");
        }

        if departamento_id.is_some() {
            sql.push_str(" AND e.departamento_id = $4");
        }

        sql.push_str(" ORDER BY j.fecha DESC, j.hora_entrada DESC");

        let mut query = sqlx::query(&sql);
        if let Some(fd) = fecha_desde { query = query.bind(fd); }
        if let Some(fh) = fecha_hasta { query = query.bind(fh); }
        if let Some(s) = sede_id { query = query.bind(s); }
        if let Some(d) = departamento_id { query = query.bind(d); }

        let rows = query.fetch_all(pool).await?;
        let mut list = Vec::new();
        for r in rows {
            list.push(AsistenciaReporteEntity {
                empleado_cedula: r.try_get("empleado_cedula")?,
                nombre_completo: r.try_get("nombre_completo")?,
                nombre_sede: r.try_get("nombre_sede").ok(),
                nombre_departamento: r.try_get("nombre_departamento").ok(),
                nombre_cargo: r.try_get("nombre_cargo").ok(),
                fecha: r.try_get("fecha")?,
                hora_entrada: r.try_get("hora_entrada").ok(),
                hora_salida: r.try_get("hora_salida").ok(),
                estado: r.try_get("estado").ok(),
                minutos_trabajados: r.try_get("minutos_trabajados").unwrap_or(0),
                puntualidad: r.try_get("puntualidad").ok(),
                minutos_retardo: r.try_get("minutos_retardo").unwrap_or(0),
                foto_entrada: r.try_get("foto_entrada").ok(),
                foto_salida: r.try_get("foto_salida").ok(),
            });
        }
        Ok(list)
    }

    /// Calcula las métricas generales en tiempo real para el portal administrativo
    pub async fn obtener_metricas(pool: &PgPool) -> Result<DashboardMetrics, sqlx::Error> {
        let total_emp: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM empleados")
            .fetch_one(pool).await.unwrap_or((0,));

        let emp_activos: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM empleados WHERE activo = true")
            .fetch_one(pool).await.unwrap_or((0,));

        let sedes_act: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM sedes WHERE activa = true")
            .fetch_one(pool).await.unwrap_or((0,));

        let asist_hoy: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM jornada_diaria WHERE fecha = CURRENT_DATE")
            .fetch_one(pool).await.unwrap_or((0,));

        let en_curso_hoy: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM jornada_diaria WHERE fecha = CURRENT_DATE AND estado = 'En curso'")
            .fetch_one(pool).await.unwrap_or((0,));

        let puntuales_hoy: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM jornada_diaria WHERE fecha = CURRENT_DATE AND puntualidad = 'Puntual'")
            .fetch_one(pool).await.unwrap_or((0,));

        let puntualidad_pct = if asist_hoy.0 > 0 {
            (puntuales_hoy.0 as f64 / asist_hoy.0 as f64) * 100.0
        } else {
            100.0
        };

        Ok(DashboardMetrics {
            total_empleados: total_emp.0,
            empleados_activos: emp_activos.0,
            sedes_activas: sedes_act.0,
            asistencias_hoy: asist_hoy.0,
            en_curso_hoy: en_curso_hoy.0,
            puntualidad_pct,
        })
    }
}
