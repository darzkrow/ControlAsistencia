use crate::state::{AppState, SessionData};
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};

/// Extractor de seguridad de Axum para verificar tokens Bearer y sesiones activas
#[derive(Clone, Debug)]
pub struct AuthClaims(pub SessionData);

#[async_trait]
impl<S> FromRequestParts<S> for AuthClaims
where
    S: Send + Sync,
    AppState: axum::extract::FromRef<S>,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);

        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok());

        let token = match auth_header {
            Some(h) if h.starts_with("Bearer ") => &h[7..],
            _ => {
                let body = Json(serde_json::json!({
                    "error": "Acceso no autorizado. Se requiere encabezado de autorización Bearer."
                }));
                return Err((StatusCode::UNAUTHORIZED, body).into_response());
            }
        };

        let sessions = app_state.sessions.read().await;
        if let Some(session) = sessions.get(token) {
            let now = chrono::Local::now().naive_local();
            if session.expires_at > now {
                return Ok(AuthClaims(session.clone()));
            }
        }

        let body = Json(serde_json::json!({
            "error": "Sesión inválida o expirada. Por favor inicie sesión nuevamente."
        }));
        Err((StatusCode::UNAUTHORIZED, body).into_response())
    }
}
