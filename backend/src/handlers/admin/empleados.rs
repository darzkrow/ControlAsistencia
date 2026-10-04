use crate::db::entities::EmpleadoDetalladoEntity;
use crate::db::repositories::EmpleadoRepository;
use crate::state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Deserialize)]
pub struct EmpleadoFilter {
    pub sede_id: Option<i32>,
    pub departamento_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct CreateEmpleadoRequest {
    pub cedula: i32,
    pub nombre_completo: String,
    pub email: Option<String>,
    pub telefono: Option<String>,
    pub departamento_nombre: Option<String>,
    pub sede_id: Option<i32>,
    pub departamento_id: Option<i32>,
    pub cargo_id: Option<i32>,
    pub turno_id: Option<i32>,
    pub foto_b64: Option<String>,
    pub template_huella: Option<String>,
}

#[derive(Deserialize)]
pub struct ToggleStatusRequest {
    pub activo: bool,
}

#[derive(Serialize)]
pub struct AdminActionResponse {
    pub exito: bool,
    pub mensaje: String,
}

pub async fn get_empleados(
    State(state): State<AppState>,
    Query(filter): Query<EmpleadoFilter>,
) -> Result<Json<Vec<EmpleadoDetalladoEntity>>, StatusCode> {
    EmpleadoRepository::listar_detallados(&state.pool, filter.sede_id, filter.departamento_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_empleado(
    State(state): State<AppState>,
    Json(payload): Json<CreateEmpleadoRequest>,
) -> Result<Json<AdminActionResponse>, StatusCode> {
    let mut ruta_foto = None;

    // Si viene fotografía referencial en Base64, guardarla en disco
    if let Some(ref b64) = payload.foto_b64 {
        let b64_clean = b64.split(',').nth(1).unwrap_or(b64);
        if let Ok(bytes) = STANDARD.decode(b64_clean) {
            fs::create_dir_all("uploads/fotos/ref").ok();
            let file_path = format!("uploads/fotos/ref/{}.jpg", payload.cedula);
            if fs::write(&file_path, bytes).is_ok() {
                ruta_foto = Some(file_path);
            }
        }
    }

    let depto_str = payload
        .departamento_nombre
        .unwrap_or_else(|| "General".to_string());

    match EmpleadoRepository::crear_empleado(
        &state.pool,
        payload.cedula,
        &payload.nombre_completo,
        payload.email.as_deref(),
        payload.telefono.as_deref(),
        &depto_str,
        payload.sede_id,
        payload.departamento_id,
        payload.cargo_id,
        payload.turno_id,
        ruta_foto.as_deref(),
        payload.template_huella.as_deref(),
    )
    .await
    {
        Ok(_) => Ok(Json(AdminActionResponse {
            exito: true,
            mensaje: format!(
                "Colaborador '{}' registrado exitosamente en el sistema.",
                payload.nombre_completo
            ),
        })),
        Err(e) => {
            eprintln!("Error registrando empleado: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn toggle_empleado_estado(
    State(state): State<AppState>,
    Path(cedula): Path<i32>,
    Json(payload): Json<ToggleStatusRequest>,
) -> Result<Json<AdminActionResponse>, StatusCode> {
    match EmpleadoRepository::cambiar_estado(&state.pool, cedula, payload.activo).await {
        Ok(_) => Ok(Json(AdminActionResponse {
            exito: true,
            mensaje: format!(
                "Estado del colaborador {} actualizado a: {}",
                cedula,
                if payload.activo { "Activo" } else { "Inactivo" }
            ),
        })),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
