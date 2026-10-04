use crate::db::repositories::seguridad::SeguridadRepository;
use crate::services::{AuthService, CryptoService};
use crate::state::AppState;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub identifier: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthErrorResponse {
    pub error: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateRolePayload {
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PoliticaUpdateItem {
    pub modelo_codigo: String,
    pub puede_crear: bool,
    pub puede_leer: bool,
    pub puede_actualizar: bool,
    pub puede_eliminar: bool,
    pub puede_exportar: bool,
    pub alcance: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUsuarioPayload {
    pub username: String,
    pub email: String,
    pub password: String,
    pub nombre_completo: String,
    pub rol_id: i32,
    pub sede_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ToggleEstadoPayload {
    pub activo: bool,
}

/// Handler de Inicio de Sesión Administrativo con políticas de seguridad
pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    match AuthService::authenticate(&state, &payload.identifier, &payload.password, None).await {
        Ok(res) => (StatusCode::OK, Json(serde_json::to_value(res).unwrap())),
        Err(msg) => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": msg })),
        ),
    }
}

/// Handler de Cierre de Sesión y Auditoría
pub async fn logout_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let email = payload.get("email").and_then(|v| v.as_str());
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    AuthService::logout(&state, token, email, None).await;

    (StatusCode::OK, Json(serde_json::json!({ "ok": true })))
}

/// Listar catálogo de roles
pub async fn get_roles_handler(State(state): State<AppState>) -> impl IntoResponse {
    match SeguridadRepository::list_roles(&state.pool).await {
        Ok(roles) => (StatusCode::OK, Json(serde_json::to_value(roles).unwrap())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Crear nuevo rol administrativo
pub async fn create_role_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateRolePayload>,
) -> impl IntoResponse {
    match SeguridadRepository::create_rol(
        &state.pool,
        &payload.codigo,
        &payload.nombre,
        payload.descripcion.as_deref(),
    )
    .await
    {
        Ok(rol) => {
            let _ = SeguridadRepository::log_auditoria(
                &state.pool,
                None,
                None,
                "CREAR_ROL",
                "ROLES",
                Some(&format!("Creado nuevo rol {}", payload.codigo)),
                None,
            )
            .await;
            (StatusCode::CREATED, Json(serde_json::to_value(rol).unwrap()))
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Listar catálogo de modelos y recursos del sistema
pub async fn get_modelos_handler(State(state): State<AppState>) -> impl IntoResponse {
    match SeguridadRepository::list_modelos(&state.pool).await {
        Ok(modelos) => (StatusCode::OK, Json(serde_json::to_value(modelos).unwrap())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Obtener políticas de acceso por modelo para un rol específico
pub async fn get_rol_politicas_handler(
    State(state): State<AppState>,
    Path(rol_id): Path<i32>,
) -> impl IntoResponse {
    match SeguridadRepository::get_politicas_by_rol(&state.pool, rol_id).await {
        Ok(politicas) => (StatusCode::OK, Json(serde_json::to_value(politicas).unwrap())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Guardar matriz de políticas de modelos para un rol
pub async fn update_rol_politicas_handler(
    State(state): State<AppState>,
    Path(rol_id): Path<i32>,
    Json(payload): Json<Vec<PoliticaUpdateItem>>,
) -> impl IntoResponse {
    for p in payload {
        if let Err(e) = SeguridadRepository::upsert_politica_modelo(
            &state.pool,
            rol_id,
            &p.modelo_codigo,
            p.puede_crear,
            p.puede_leer,
            p.puede_actualizar,
            p.puede_eliminar,
            p.puede_exportar,
            &p.alcance,
        )
        .await
        {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            );
        }
    }

    let _ = SeguridadRepository::log_auditoria(
        &state.pool,
        None,
        None,
        "ACTUALIZAR_POLITICAS",
        "MODELOS",
        Some(&format!("Actualizadas políticas de modelos para rol ID {}", rol_id)),
        None,
    )
    .await;

    (StatusCode::OK, Json(serde_json::json!({ "ok": true })))
}

/// Listar usuarios administradores
pub async fn get_usuarios_handler(State(state): State<AppState>) -> impl IntoResponse {
    match SeguridadRepository::list_usuarios(&state.pool).await {
        Ok(usuarios) => (StatusCode::OK, Json(serde_json::to_value(usuarios).unwrap())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Crear usuario administrativo
pub async fn create_usuario_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateUsuarioPayload>,
) -> impl IntoResponse {
    if payload.password.trim().len() < 6 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "La contraseña debe contener al menos 6 caracteres." })),
        );
    }

    // Hasheo seguro con Salt aleatorio y SHA-256
    let hashed_pw = CryptoService::hash_password(&payload.password);

    match SeguridadRepository::create_usuario(
        &state.pool,
        &payload.username,
        &payload.email,
        &hashed_pw,
        &payload.nombre_completo,
        payload.rol_id,
        payload.sede_id,
    )
    .await
    {
        Ok(id) => {
            let _ = SeguridadRepository::log_auditoria(
                &state.pool,
                None,
                None,
                "CREAR_USUARIO",
                "SEGURIDAD",
                Some(&format!("Creado usuario {}", payload.username)),
                None,
            )
            .await;
            (StatusCode::CREATED, Json(serde_json::json!({ "id": id, "ok": true })))
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Alternar estado de usuario
pub async fn toggle_usuario_estado_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<ToggleEstadoPayload>,
) -> impl IntoResponse {
    match SeguridadRepository::toggle_usuario_estado(&state.pool, id, payload.activo).await {
        Ok(_) => {
            let _ = SeguridadRepository::log_auditoria(
                &state.pool,
                None,
                None,
                "ESTADO_USUARIO",
                "SEGURIDAD",
                Some(&format!("Usuario ID {} cambiado a activo={}", id, payload.activo)),
                None,
            )
            .await;
            (StatusCode::OK, Json(serde_json::json!({ "ok": true })))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Desbloquear usuario administrativo bloqueado por fuerza bruta
pub async fn unlock_usuario_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    match SeguridadRepository::unlock_usuario(&state.pool, id).await {
        Ok(_) => {
            let _ = SeguridadRepository::log_auditoria(
                &state.pool,
                None,
                None,
                "DESBLOQUEO_USUARIO",
                "SEGURIDAD",
                Some(&format!("Desbloqueo manual de cuenta ID {}", id)),
                None,
            )
            .await;
            (StatusCode::OK, Json(serde_json::json!({ "ok": true })))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Listar auditoría de seguridad
pub async fn get_auditoria_handler(State(state): State<AppState>) -> impl IntoResponse {
    match SeguridadRepository::list_auditoria(&state.pool, 100).await {
        Ok(logs) => (StatusCode::OK, Json(serde_json::to_value(logs).unwrap())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}
