use crate::db::entities::seguridad::*;
use crate::db::repositories::seguridad::SeguridadRepository;
use crate::services::CryptoService;
use crate::state::{AppState, SessionData};
use uuid::Uuid;

pub struct AuthService;

impl AuthService {
    /// Autenticar usuario con políticas de seguridad reforzadas
    /// - Hashing criptográfico Salted SHA-256
    /// - Comparación en tiempo constante (anti timing-attacks)
    /// - Bloqueo por fuerza bruta tras 5 intentos
    /// - Gestión de sesión en memoria con TTL de 8 horas
    pub async fn authenticate(
        state: &AppState,
        identifier: &str,
        password: &str,
        ip: Option<&str>,
    ) -> Result<LoginResponse, String> {
        let pool = &state.pool;
        let user_opt = SeguridadRepository::find_usuario_by_identifier(pool, identifier)
            .await
            .map_err(|e| format!("Error en base de datos: {}", e))?;

        let user = match user_opt {
            Some(u) => u,
            None => {
                let _ = SeguridadRepository::log_auditoria(
                    pool,
                    None,
                    Some(identifier),
                    "LOGIN_FALLIDO",
                    "AUTH",
                    Some("Identificador de usuario no encontrado"),
                    ip,
                )
                .await;
                return Err("Credenciales de acceso inválidas".to_string());
            }
        };

        // 1. Verificar si la cuenta está activa
        if !user.activo {
            let _ = SeguridadRepository::log_auditoria(
                pool,
                Some(user.id),
                Some(&user.email),
                "ACCESO_DENEGADO",
                "AUTH",
                Some("Intento de acceso con cuenta desactivada"),
                ip,
            )
            .await;
            return Err("Su cuenta se encuentra inactiva. Contacte al administrador de seguridad.".to_string());
        }

        // 2. Verificar política de bloqueo temporal por fuerza bruta
        if let Some(bloqueado) = user.bloqueado_hasta {
            let now = chrono::Local::now().naive_local();
            if bloqueado > now {
                let diff = (bloqueado - now).num_minutes();
                let _ = SeguridadRepository::log_auditoria(
                    pool,
                    Some(user.id),
                    Some(&user.email),
                    "LOGIN_BLOQUEADO",
                    "AUTH",
                    Some(&format!("Intento de acceso durante bloqueo temporal (restan ~{} min)", diff)),
                    ip,
                )
                .await;
                return Err(format!(
                    "Cuenta bloqueada temporalmente por exceso de intentos fallidos. Intente de nuevo en {} minutos.",
                    diff.max(1)
                ));
            }
        }

        // 3. Validación criptográfica de contraseña en tiempo constante
        // Soporta hashes salt$hash o hash SHA-256 de 64 caracteres; cero backdoors.
        let is_valid = CryptoService::verify_password(password, &user.password_hash);

        if !is_valid {
            let _ = SeguridadRepository::record_login_failure(pool, user.id).await;
            let _ = SeguridadRepository::log_auditoria(
                pool,
                Some(user.id),
                Some(&user.email),
                "LOGIN_FALLIDO",
                "AUTH",
                Some("Contraseña incorrecta suministrada"),
                ip,
            )
            .await;
            return Err("Credenciales de acceso inválidas".to_string());
        }

        // 4. Éxito: Limpiar intentos fallidos y registrar fecha de último login
        let _ = SeguridadRepository::record_login_success(pool, user.id).await;

        // 5. Cargar perfil detallado y políticas de acceso a modelos asignadas al rol
        let detallado = match SeguridadRepository::get_usuario_detallado(pool, user.id).await {
            Ok(Some(d)) => d,
            _ => return Err("Error al resolver perfil del usuario".to_string()),
        };

        let politicas = SeguridadRepository::get_politicas_by_rol(pool, user.rol_id)
            .await
            .unwrap_or_default();

        // 6. Generar token criptográfico de sesión con entropía alta
        let token = format!("rapture_sec_{}_{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());

        // 7. Almacenar sesión activa en memoria con TTL de 8 horas
        let session = SessionData {
            usuario_id: detallado.id,
            username: detallado.username.clone(),
            email: detallado.email.clone(),
            rol_id: detallado.rol_id,
            rol_codigo: detallado.rol_codigo.clone(),
            sede_id: detallado.sede_id,
            expires_at: chrono::Local::now().naive_local() + chrono::Duration::hours(8),
        };
        state.sessions.write().await.insert(token.clone(), session);

        // 8. Registrar auditoría de sesión exitosa
        let _ = SeguridadRepository::log_auditoria(
            pool,
            Some(user.id),
            Some(&user.email),
            "LOGIN_EXITOSO",
            "AUTH",
            Some(&format!("Inicio de sesión administrativo con rol {}", detallado.rol_codigo)),
            ip,
        )
        .await;

        Ok(LoginResponse {
            token,
            usuario: detallado,
            politicas,
        })
    }

    /// Cierre de sesión seguro e invalidación del token en memoria
    pub async fn logout(
        state: &AppState,
        token: Option<&str>,
        email: Option<&str>,
        ip: Option<&str>,
    ) {
        if let Some(t) = token {
            state.sessions.write().await.remove(t);
        }

        let _ = SeguridadRepository::log_auditoria(
            &state.pool,
            None,
            email,
            "LOGOUT",
            "AUTH",
            Some("Cierre de sesión administrativo e invalidación de token"),
            ip,
        )
        .await;
    }
}
