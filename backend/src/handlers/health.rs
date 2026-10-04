use crate::models::HealthResponse;
use axum::Json;
use chrono::Local;

pub async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "rapture-biometric-backend",
        version: "2.1.0",
        timestamp: Local::now().to_rfc3339(),
    })
}
