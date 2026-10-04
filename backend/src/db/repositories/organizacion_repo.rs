use crate::db::entities::{CargoEntity, DepartamentoEntity, SedeEntity, TurnoEntity};
use chrono::NaiveTime;
use sqlx::{PgPool, Row};

pub struct OrganizacionRepository;

impl OrganizacionRepository {
    // -------------------------------------------------------------------------
    // SEDES
    // -------------------------------------------------------------------------
    pub async fn listar_sedes(pool: &PgPool) -> Result<Vec<SedeEntity>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, codigo, nombre, direccion, ciudad, activa, created_at 
             FROM sedes 
             ORDER BY nombre ASC"
        )
        .fetch_all(pool)
        .await?;

        let mut sedes = Vec::new();
        for r in rows {
            sedes.push(SedeEntity {
                id: r.try_get("id")?,
                codigo: r.try_get("codigo")?,
                nombre: r.try_get("nombre")?,
                direccion: r.try_get("direccion").ok(),
                ciudad: r.try_get("ciudad").ok(),
                activa: r.try_get("activa").unwrap_or(true),
                created_at: r.try_get("created_at").ok(),
            });
        }
        Ok(sedes)
    }

    pub async fn crear_sede(
        pool: &PgPool,
        codigo: &str,
        nombre: &str,
        direccion: Option<&str>,
        ciudad: Option<&str>,
    ) -> Result<SedeEntity, sqlx::Error> {
        let r = sqlx::query(
            "INSERT INTO sedes (codigo, nombre, direccion, ciudad, activa) 
             VALUES ($1, $2, $3, $4, true) 
             RETURNING id, codigo, nombre, direccion, ciudad, activa, created_at"
        )
        .bind(codigo)
        .bind(nombre)
        .bind(direccion)
        .bind(ciudad)
        .fetch_one(pool)
        .await?;

        Ok(SedeEntity {
            id: r.try_get("id")?,
            codigo: r.try_get("codigo")?,
            nombre: r.try_get("nombre")?,
            direccion: r.try_get("direccion").ok(),
            ciudad: r.try_get("ciudad").ok(),
            activa: r.try_get("activa").unwrap_or(true),
            created_at: r.try_get("created_at").ok(),
        })
    }

    // -------------------------------------------------------------------------
    // DEPARTAMENTOS
    // -------------------------------------------------------------------------
    pub async fn listar_departamentos(
        pool: &PgPool,
        sede_id: Option<i32>,
    ) -> Result<Vec<DepartamentoEntity>, sqlx::Error> {
        let query_str = match sede_id {
            Some(_) => {
                "SELECT d.id, d.sede_id, d.codigo, d.nombre, d.activo, d.created_at, s.nombre as nombre_sede 
                 FROM departamentos d 
                 JOIN sedes s ON s.id = d.sede_id 
                 WHERE d.sede_id = $1 
                 ORDER BY d.nombre ASC"
            }
            None => {
                "SELECT d.id, d.sede_id, d.codigo, d.nombre, d.activo, d.created_at, s.nombre as nombre_sede 
                 FROM departamentos d 
                 JOIN sedes s ON s.id = d.sede_id 
                 ORDER BY s.nombre ASC, d.nombre ASC"
            }
        };

        let mut query = sqlx::query(query_str);
        if let Some(s_id) = sede_id {
            query = query.bind(s_id);
        }

        let rows = query.fetch_all(pool).await?;
        let mut deptos = Vec::new();
        for r in rows {
            deptos.push(DepartamentoEntity {
                id: r.try_get("id")?,
                sede_id: r.try_get("sede_id")?,
                codigo: r.try_get("codigo")?,
                nombre: r.try_get("nombre")?,
                activo: r.try_get("activo").unwrap_or(true),
                created_at: r.try_get("created_at").ok(),
                nombre_sede: r.try_get("nombre_sede").ok(),
            });
        }
        Ok(deptos)
    }

    pub async fn crear_departamento(
        pool: &PgPool,
        sede_id: i32,
        codigo: &str,
        nombre: &str,
    ) -> Result<DepartamentoEntity, sqlx::Error> {
        let r = sqlx::query(
            "INSERT INTO departamentos (sede_id, codigo, nombre, activo) 
             VALUES ($1, $2, $3, true) 
             RETURNING id, sede_id, codigo, nombre, activo, created_at"
        )
        .bind(sede_id)
        .bind(codigo)
        .bind(nombre)
        .fetch_one(pool)
        .await?;

        Ok(DepartamentoEntity {
            id: r.try_get("id")?,
            sede_id: r.try_get("sede_id")?,
            codigo: r.try_get("codigo")?,
            nombre: r.try_get("nombre")?,
            activo: r.try_get("activo").unwrap_or(true),
            created_at: r.try_get("created_at").ok(),
            nombre_sede: None,
        })
    }

    // -------------------------------------------------------------------------
    // CARGOS
    // -------------------------------------------------------------------------
    pub async fn listar_cargos(
        pool: &PgPool,
        departamento_id: Option<i32>,
    ) -> Result<Vec<CargoEntity>, sqlx::Error> {
        let query_str = match departamento_id {
            Some(_) => {
                "SELECT c.id, c.departamento_id, c.nombre, c.descripcion, c.created_at, d.nombre as nombre_departamento 
                 FROM cargos c 
                 JOIN departamentos d ON d.id = c.departamento_id 
                 WHERE c.departamento_id = $1 
                 ORDER BY c.nombre ASC"
            }
            None => {
                "SELECT c.id, c.departamento_id, c.nombre, c.descripcion, c.created_at, d.nombre as nombre_departamento 
                 FROM cargos c 
                 JOIN departamentos d ON d.id = c.departamento_id 
                 ORDER BY d.nombre ASC, c.nombre ASC"
            }
        };

        let mut query = sqlx::query(query_str);
        if let Some(d_id) = departamento_id {
            query = query.bind(d_id);
        }

        let rows = query.fetch_all(pool).await?;
        let mut cargos = Vec::new();
        for r in rows {
            cargos.push(CargoEntity {
                id: r.try_get("id")?,
                departamento_id: r.try_get("departamento_id")?,
                nombre: r.try_get("nombre")?,
                descripcion: r.try_get("descripcion").ok(),
                created_at: r.try_get("created_at").ok(),
                nombre_departamento: r.try_get("nombre_departamento").ok(),
            });
        }
        Ok(cargos)
    }

    pub async fn crear_cargo(
        pool: &PgPool,
        departamento_id: i32,
        nombre: &str,
        descripcion: Option<&str>,
    ) -> Result<CargoEntity, sqlx::Error> {
        let r = sqlx::query(
            "INSERT INTO cargos (departamento_id, nombre, descripcion) 
             VALUES ($1, $2, $3) 
             RETURNING id, departamento_id, nombre, descripcion, created_at"
        )
        .bind(departamento_id)
        .bind(nombre)
        .bind(descripcion)
        .fetch_one(pool)
        .await?;

        Ok(CargoEntity {
            id: r.try_get("id")?,
            departamento_id: r.try_get("departamento_id")?,
            nombre: r.try_get("nombre")?,
            descripcion: r.try_get("descripcion").ok(),
            created_at: r.try_get("created_at").ok(),
            nombre_departamento: None,
        })
    }

    // -------------------------------------------------------------------------
    // TURNOS Y HORARIOS LABORALES
    // -------------------------------------------------------------------------
    pub async fn listar_turnos(pool: &PgPool) -> Result<Vec<TurnoEntity>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, nombre, hora_entrada, hora_salida, tolerancia_minutos, dias_laborales, activo, created_at 
             FROM turnos_horarios 
             ORDER BY nombre ASC"
        )
        .fetch_all(pool)
        .await?;

        let mut turnos = Vec::new();
        for r in rows {
            turnos.push(TurnoEntity {
                id: r.try_get("id")?,
                nombre: r.try_get("nombre")?,
                hora_entrada: r.try_get("hora_entrada")?,
                hora_salida: r.try_get("hora_salida")?,
                tolerancia_minutos: r.try_get("tolerancia_minutos").unwrap_or(15),
                dias_laborales: r.try_get("dias_laborales").unwrap_or_else(|_| "L,M,X,J,V".to_string()),
                activo: r.try_get("activo").unwrap_or(true),
                created_at: r.try_get("created_at").ok(),
            });
        }
        Ok(turnos)
    }

    pub async fn crear_turno(
        pool: &PgPool,
        nombre: &str,
        hora_entrada: NaiveTime,
        hora_salida: NaiveTime,
        tolerancia_minutos: i32,
        dias_laborales: &str,
    ) -> Result<TurnoEntity, sqlx::Error> {
        let r = sqlx::query(
            "INSERT INTO turnos_horarios (nombre, hora_entrada, hora_salida, tolerancia_minutos, dias_laborales, activo) 
             VALUES ($1, $2, $3, $4, $5, true) 
             RETURNING id, nombre, hora_entrada, hora_salida, tolerancia_minutos, dias_laborales, activo, created_at"
        )
        .bind(nombre)
        .bind(hora_entrada)
        .bind(hora_salida)
        .bind(tolerancia_minutos)
        .bind(dias_laborales)
        .fetch_one(pool)
        .await?;

        Ok(TurnoEntity {
            id: r.try_get("id")?,
            nombre: r.try_get("nombre")?,
            hora_entrada: r.try_get("hora_entrada")?,
            hora_salida: r.try_get("hora_salida")?,
            tolerancia_minutos: r.try_get("tolerancia_minutos").unwrap_or(15),
            dias_laborales: r.try_get("dias_laborales").unwrap_or_else(|_| "L,M,X,J,V".to_string()),
            activo: r.try_get("activo").unwrap_or(true),
            created_at: r.try_get("created_at").ok(),
        })
    }
}
