use crate::db::entities::seguridad::*;
use sqlx::{PgPool, Row};

pub struct SeguridadRepository;

impl SeguridadRepository {
    /// Buscar usuario por username o email para proceso de login
    pub async fn find_usuario_by_identifier(
        pool: &PgPool,
        identifier: &str,
    ) -> Result<Option<UsuarioAdminEntity>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, username, email, password_hash, nombre_completo, rol_id, sede_id,
                   intentos_fallidos, bloqueado_hasta, activo, ultimo_login, created_at
            FROM public.usuarios_admin
            WHERE username = $1 OR email = $1
            "#,
        )
        .bind(identifier)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| UsuarioAdminEntity {
            id: r.get("id"),
            username: r.get("username"),
            email: r.get("email"),
            password_hash: r.get("password_hash"),
            nombre_completo: r.get("nombre_completo"),
            rol_id: r.get("rol_id"),
            sede_id: r.get("sede_id"),
            intentos_fallidos: r.get("intentos_fallidos"),
            bloqueado_hasta: r.get("bloqueado_hasta"),
            activo: r.get("activo"),
            ultimo_login: r.get("ultimo_login"),
            created_at: r.get("created_at"),
        }))
    }

    /// Obtener usuario detallado con información de rol y sede
    pub async fn get_usuario_detallado(
        pool: &PgPool,
        id: i32,
    ) -> Result<Option<UsuarioDetalladoEntity>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT u.id, u.username, u.email, u.nombre_completo, u.rol_id, r.codigo as rol_codigo,
                   r.nombre as rol_nombre, u.sede_id, s.nombre as sede_nombre, u.intentos_fallidos,
                   u.bloqueado_hasta, u.activo, u.ultimo_login, u.created_at
            FROM public.usuarios_admin u
            JOIN public.roles r ON u.rol_id = r.id
            LEFT JOIN public.sedes s ON u.sede_id = s.id
            WHERE u.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| UsuarioDetalladoEntity {
            id: r.get("id"),
            username: r.get("username"),
            email: r.get("email"),
            nombre_completo: r.get("nombre_completo"),
            rol_id: r.get("rol_id"),
            rol_codigo: r.get("rol_codigo"),
            rol_nombre: r.get("rol_nombre"),
            sede_id: r.get("sede_id"),
            sede_nombre: r.get("sede_nombre"),
            intentos_fallidos: r.get("intentos_fallidos"),
            bloqueado_hasta: r.get("bloqueado_hasta"),
            activo: r.get("activo"),
            ultimo_login: r.get("ultimo_login"),
            created_at: r.get("created_at"),
        }))
    }

    /// Registrar fallo de login con política de bloqueo tras 5 intentos
    pub async fn record_login_failure(pool: &PgPool, usuario_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE public.usuarios_admin
            SET intentos_fallidos = intentos_fallidos + 1,
                bloqueado_hasta = CASE 
                    WHEN intentos_fallidos + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
                    ELSE bloqueado_hasta
                END
            WHERE id = $1
            "#,
        )
        .bind(usuario_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Registrar éxito de login y limpiar contador de fallos
    pub async fn record_login_success(pool: &PgPool, usuario_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE public.usuarios_admin
            SET intentos_fallidos = 0,
                bloqueado_hasta = NULL,
                ultimo_login = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
        )
        .bind(usuario_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Listar todos los roles
    pub async fn list_roles(pool: &PgPool) -> Result<Vec<RolEntity>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, codigo, nombre, descripcion, es_sistema, activo, created_at
            FROM public.roles
            ORDER BY id ASC
            "#,
        )
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| RolEntity {
                id: r.get("id"),
                codigo: r.get("codigo"),
                nombre: r.get("nombre"),
                descripcion: r.get("descripcion"),
                es_sistema: r.get("es_sistema"),
                activo: r.get("activo"),
                created_at: r.get("created_at"),
            })
            .collect())
    }

    /// Crear un nuevo rol dinámico
    pub async fn create_rol(
        pool: &PgPool,
        codigo: &str,
        nombre: &str,
        descripcion: Option<&str>,
    ) -> Result<RolEntity, sqlx::Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO public.roles (codigo, nombre, descripcion, es_sistema, activo)
            VALUES ($1, $2, $3, false, true)
            RETURNING id, codigo, nombre, descripcion, es_sistema, activo, created_at
            "#,
        )
        .bind(codigo)
        .bind(nombre)
        .bind(descripcion)
        .fetch_one(pool)
        .await?;

        Ok(RolEntity {
            id: row.get("id"),
            codigo: row.get("codigo"),
            nombre: row.get("nombre"),
            descripcion: row.get("descripcion"),
            es_sistema: row.get("es_sistema"),
            activo: row.get("activo"),
            created_at: row.get("created_at"),
        })
    }

    /// Listar catálogo de modelos y recursos del sistema
    pub async fn list_modelos(pool: &PgPool) -> Result<Vec<ModeloRecursoEntity>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT codigo, nombre, descripcion, icono, soporta_alcance_sede, acciones_disponibles
            FROM public.modelos_recurso
            ORDER BY codigo ASC
            "#,
        )
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| ModeloRecursoEntity {
                codigo: r.get("codigo"),
                nombre: r.get("nombre"),
                descripcion: r.get("descripcion"),
                icono: r.get("icono"),
                soporta_alcance_sede: r.get("soporta_alcance_sede"),
                acciones_disponibles: r.get("acciones_disponibles"),
            })
            .collect())
    }

    /// Obtener políticas de acceso a modelos asignadas a un rol
    pub async fn get_politicas_by_rol(
        pool: &PgPool,
        rol_id: i32,
    ) -> Result<Vec<RolPoliticaModeloEntity>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar,
                   puede_eliminar, puede_exportar, alcance, created_at
            FROM public.rol_politicas_modelo
            WHERE rol_id = $1
            ORDER BY modelo_codigo ASC
            "#,
        )
        .bind(rol_id)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| RolPoliticaModeloEntity {
                id: r.get("id"),
                rol_id: r.get("rol_id"),
                modelo_codigo: r.get("modelo_codigo"),
                puede_crear: r.get("puede_crear"),
                puede_leer: r.get("puede_leer"),
                puede_actualizar: r.get("puede_actualizar"),
                puede_eliminar: r.get("puede_eliminar"),
                puede_exportar: r.get("puede_exportar"),
                alcance: r.get("alcance"),
                created_at: r.get("created_at"),
            })
            .collect())
    }

    /// Guardar o actualizar la política de acceso de un modelo para un rol
    pub async fn upsert_politica_modelo(
        pool: &PgPool,
        rol_id: i32,
        modelo_codigo: &str,
        puede_crear: bool,
        puede_leer: bool,
        puede_actualizar: bool,
        puede_eliminar: bool,
        puede_exportar: bool,
        alcance: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO public.rol_politicas_modelo 
            (rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar, puede_eliminar, puede_exportar, alcance)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (rol_id, modelo_codigo) DO UPDATE SET
                puede_crear = EXCLUDED.puede_crear,
                puede_leer = EXCLUDED.puede_leer,
                puede_actualizar = EXCLUDED.puede_actualizar,
                puede_eliminar = EXCLUDED.puede_eliminar,
                puede_exportar = EXCLUDED.puede_exportar,
                alcance = EXCLUDED.alcance
            "#,
        )
        .bind(rol_id)
        .bind(modelo_codigo)
        .bind(puede_crear)
        .bind(puede_leer)
        .bind(puede_actualizar)
        .bind(puede_eliminar)
        .bind(puede_exportar)
        .bind(alcance)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Listar usuarios administrativos
    pub async fn list_usuarios(pool: &PgPool) -> Result<Vec<UsuarioDetalladoEntity>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT u.id, u.username, u.email, u.nombre_completo, u.rol_id, r.codigo as rol_codigo,
                   r.nombre as rol_nombre, u.sede_id, s.nombre as sede_nombre, u.intentos_fallidos,
                   u.bloqueado_hasta, u.activo, u.ultimo_login, u.created_at
            FROM public.usuarios_admin u
            JOIN public.roles r ON u.rol_id = r.id
            LEFT JOIN public.sedes s ON u.sede_id = s.id
            ORDER BY u.id ASC
            "#,
        )
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| UsuarioDetalladoEntity {
                id: r.get("id"),
                username: r.get("username"),
                email: r.get("email"),
                nombre_completo: r.get("nombre_completo"),
                rol_id: r.get("rol_id"),
                rol_codigo: r.get("rol_codigo"),
                rol_nombre: r.get("rol_nombre"),
                sede_id: r.get("sede_id"),
                sede_nombre: r.get("sede_nombre"),
                intentos_fallidos: r.get("intentos_fallidos"),
                bloqueado_hasta: r.get("bloqueado_hasta"),
                activo: r.get("activo"),
                ultimo_login: r.get("ultimo_login"),
                created_at: r.get("created_at"),
            })
            .collect())
    }

    /// Crear nuevo usuario administrativo
    pub async fn create_usuario(
        pool: &PgPool,
        username: &str,
        email: &str,
        password_hash: &str,
        nombre_completo: &str,
        rol_id: i32,
        sede_id: Option<i32>,
    ) -> Result<i32, sqlx::Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO public.usuarios_admin (username, email, password_hash, nombre_completo, rol_id, sede_id, activo)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING id
            "#,
        )
        .bind(username)
        .bind(email)
        .bind(password_hash)
        .bind(nombre_completo)
        .bind(rol_id)
        .bind(sede_id)
        .fetch_one(pool)
        .await?;

        Ok(row.get("id"))
    }

    /// Alternar estado activo de un usuario
    pub async fn toggle_usuario_estado(
        pool: &PgPool,
        id: i32,
        activo: bool,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE public.usuarios_admin
            SET activo = $2
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(activo)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Desbloquear usuario administrativo
    pub async fn unlock_usuario(pool: &PgPool, id: i32) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE public.usuarios_admin
            SET intentos_fallidos = 0, bloqueado_hasta = NULL
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Listar eventos de la pista de auditoría de seguridad
    pub async fn list_auditoria(
        pool: &PgPool,
        limite: i64,
    ) -> Result<Vec<AuditoriaSeguridadEntity>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, usuario_id, usuario_email, accion, modulo, detalles, ip_origen, fecha_hora
            FROM public.auditoria_seguridad
            ORDER BY fecha_hora DESC
            LIMIT $1
            "#,
        )
        .bind(limite)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| AuditoriaSeguridadEntity {
                id: r.get("id"),
                usuario_id: r.get("usuario_id"),
                usuario_email: r.get("usuario_email"),
                accion: r.get("accion"),
                modulo: r.get("modulo"),
                detalles: r.get("detalles"),
                ip_origen: r.get("ip_origen"),
                fecha_hora: r.get("fecha_hora"),
            })
            .collect())
    }

    /// Registrar un evento de seguridad en la auditoría
    pub async fn log_auditoria(
        pool: &PgPool,
        usuario_id: Option<i32>,
        usuario_email: Option<&str>,
        accion: &str,
        modulo: &str,
        detalles: Option<&str>,
        ip_origen: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO public.auditoria_seguridad (usuario_id, usuario_email, accion, modulo, detalles, ip_origen)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(usuario_id)
        .bind(usuario_email)
        .bind(accion)
        .bind(modulo)
        .bind(detalles)
        .bind(ip_origen.unwrap_or("127.0.0.1"))
        .execute(pool)
        .await?;

        Ok(())
    }
}
