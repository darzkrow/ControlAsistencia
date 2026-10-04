use crate::db::entities::{EmpleadoDetalladoEntity, EmpleadoEntity};
use sqlx::{PgPool, Row};

pub struct EmpleadoRepository;

impl EmpleadoRepository {
    /// Busca un empleado simple por su número de cédula
    pub async fn buscar_por_cedula(pool: &PgPool, cedula: i32) -> Result<Option<EmpleadoEntity>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT cedula, nombre_completo, departamento, foto_referencial, template_huella, activo 
             FROM empleados 
             WHERE cedula = $1"
        )
        .bind(cedula)
        .fetch_optional(pool)
        .await?;

        match row {
            Some(r) => Ok(Some(EmpleadoEntity {
                cedula: r.try_get("cedula")?,
                nombre_completo: r.try_get("nombre_completo")?,
                departamento: r.try_get("departamento")?,
                foto_referencial: r.try_get("foto_referencial").ok(),
                template_huella: r.try_get("template_huella").ok(),
                activo: r.try_get("activo").unwrap_or(true),
            })),
            None => Ok(None),
        }
    }

    /// Lista todos los empleados con su detalle organizativo completo
    pub async fn listar_detallados(
        pool: &PgPool,
        sede_id: Option<i32>,
        departamento_id: Option<i32>,
    ) -> Result<Vec<EmpleadoDetalladoEntity>, sqlx::Error> {
        let mut sql = String::from(
            "SELECT e.cedula, e.nombre_completo, e.email, e.telefono, e.departamento,
                    e.sede_id, s.nombre as nombre_sede,
                    e.departamento_id, d.nombre as nombre_departamento,
                    e.cargo_id, c.nombre as nombre_cargo,
                    e.turno_id, t.nombre as nombre_turno,
                    e.foto_referencial, e.template_huella, e.activo, e.created_at
             FROM empleados e
             LEFT JOIN sedes s ON s.id = e.sede_id
             LEFT JOIN departamentos d ON d.id = e.departamento_id
             LEFT JOIN cargos c ON c.id = e.cargo_id
             LEFT JOIN turnos_horarios t ON t.id = e.turno_id
             WHERE 1=1"
        );

        if sede_id.is_some() {
            sql.push_str(" AND e.sede_id = $1");
        }
        if departamento_id.is_some() {
            if sede_id.is_some() {
                sql.push_str(" AND e.departamento_id = $2");
            } else {
                sql.push_str(" AND e.departamento_id = $1");
            }
        }
        sql.push_str(" ORDER BY e.nombre_completo ASC");

        let mut query = sqlx::query(&sql);
        if let Some(s) = sede_id {
            query = query.bind(s);
        }
        if let Some(d) = departamento_id {
            query = query.bind(d);
        }

        let rows = query.fetch_all(pool).await?;
        let mut list = Vec::new();
        for r in rows {
            list.push(EmpleadoDetalladoEntity {
                cedula: r.try_get("cedula")?,
                nombre_completo: r.try_get("nombre_completo")?,
                email: r.try_get("email").ok(),
                telefono: r.try_get("telefono").ok(),
                departamento: r.try_get("departamento").unwrap_or_default(),
                sede_id: r.try_get("sede_id").ok(),
                nombre_sede: r.try_get("nombre_sede").ok(),
                departamento_id: r.try_get("departamento_id").ok(),
                nombre_departamento: r.try_get("nombre_departamento").ok(),
                cargo_id: r.try_get("cargo_id").ok(),
                nombre_cargo: r.try_get("nombre_cargo").ok(),
                turno_id: r.try_get("turno_id").ok(),
                nombre_turno: r.try_get("nombre_turno").ok(),
                foto_referencial: r.try_get("foto_referencial").ok(),
                template_huella: r.try_get("template_huella").ok(),
                activo: r.try_get("activo").unwrap_or(true),
                created_at: r.try_get("created_at").ok(),
            });
        }
        Ok(list)
    }

    /// Registra un nuevo colaborador vinculado a la estructura organizativa
    pub async fn crear_empleado(
        pool: &PgPool,
        cedula: i32,
        nombre_completo: &str,
        email: Option<&str>,
        telefono: Option<&str>,
        departamento_nombre: &str,
        sede_id: Option<i32>,
        departamento_id: Option<i32>,
        cargo_id: Option<i32>,
        turno_id: Option<i32>,
        foto_referencial: Option<&str>,
        template_huella: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO empleados (
                cedula, nombre_completo, email, telefono, departamento,
                sede_id, departamento_id, cargo_id, turno_id,
                foto_referencial, template_huella, activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
            ON CONFLICT (cedula) DO UPDATE SET
                nombre_completo = EXCLUDED.nombre_completo,
                email = EXCLUDED.email,
                telefono = EXCLUDED.telefono,
                departamento = EXCLUDED.departamento,
                sede_id = EXCLUDED.sede_id,
                departamento_id = EXCLUDED.departamento_id,
                cargo_id = EXCLUDED.cargo_id,
                turno_id = EXCLUDED.turno_id,
                foto_referencial = COALESCE(EXCLUDED.foto_referencial, empleados.foto_referencial),
                template_huella = COALESCE(EXCLUDED.template_huella, empleados.template_huella),
                activo = true"
        )
        .bind(cedula)
        .bind(nombre_completo)
        .bind(email)
        .bind(telefono)
        .bind(departamento_nombre)
        .bind(sede_id)
        .bind(departamento_id)
        .bind(cargo_id)
        .bind(turno_id)
        .bind(foto_referencial)
        .bind(template_huella)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Activa o desactiva a un colaborador
    pub async fn cambiar_estado(pool: &PgPool, cedula: i32, activo: bool) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE empleados SET activo = $1 WHERE cedula = $2")
            .bind(activo)
            .bind(cedula)
            .execute(pool)
            .await?;
        Ok(())
    }
}
