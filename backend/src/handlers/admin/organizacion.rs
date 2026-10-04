use crate::db::entities::{CargoEntity, DepartamentoEntity, SedeEntity, TurnoEntity};
use crate::db::repositories::OrganizacionRepository;
use crate::state::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::NaiveTime;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CreateSedeRequest {
    pub codigo: String,
    pub nombre: String,
    pub direccion: Option<String>,
    pub ciudad: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateDeptoRequest {
    pub sede_id: i32,
    pub codigo: String,
    pub nombre: String,
}

#[derive(Deserialize)]
pub struct CreateCargoRequest {
    pub departamento_id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateTurnoRequest {
    pub nombre: String,
    pub hora_entrada: String, // HH:MM:SS
    pub hora_salida: String,  // HH:MM:SS
    pub tolerancia_minutos: Option<i32>,
    pub dias_laborales: Option<String>,
}

#[derive(Deserialize)]
pub struct QueryFilter {
    pub sede_id: Option<i32>,
    pub departamento_id: Option<i32>,
}

// -----------------------------------------------------------------------------
// SEDES
// -----------------------------------------------------------------------------
pub async fn get_sedes(State(state): State<AppState>) -> Result<Json<Vec<SedeEntity>>, StatusCode> {
    OrganizacionRepository::listar_sedes(&state.pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_sede(
    State(state): State<AppState>,
    Json(payload): Json<CreateSedeRequest>,
) -> Result<Json<SedeEntity>, StatusCode> {
    OrganizacionRepository::crear_sede(
        &state.pool,
        &payload.codigo,
        &payload.nombre,
        payload.direccion.as_deref(),
        payload.ciudad.as_deref(),
    )
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

// -----------------------------------------------------------------------------
// DEPARTAMENTOS
// -----------------------------------------------------------------------------
pub async fn get_departamentos(
    State(state): State<AppState>,
    Query(filter): Query<QueryFilter>,
) -> Result<Json<Vec<DepartamentoEntity>>, StatusCode> {
    OrganizacionRepository::listar_departamentos(&state.pool, filter.sede_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_departamento(
    State(state): State<AppState>,
    Json(payload): Json<CreateDeptoRequest>,
) -> Result<Json<DepartamentoEntity>, StatusCode> {
    OrganizacionRepository::crear_departamento(
        &state.pool,
        payload.sede_id,
        &payload.codigo,
        &payload.nombre,
    )
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

// -----------------------------------------------------------------------------
// CARGOS
// -----------------------------------------------------------------------------
pub async fn get_cargos(
    State(state): State<AppState>,
    Query(filter): Query<QueryFilter>,
) -> Result<Json<Vec<CargoEntity>>, StatusCode> {
    OrganizacionRepository::listar_cargos(&state.pool, filter.departamento_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_cargo(
    State(state): State<AppState>,
    Json(payload): Json<CreateCargoRequest>,
) -> Result<Json<CargoEntity>, StatusCode> {
    OrganizacionRepository::crear_cargo(
        &state.pool,
        payload.departamento_id,
        &payload.nombre,
        payload.descripcion.as_deref(),
    )
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

// -----------------------------------------------------------------------------
// TURNOS
// -----------------------------------------------------------------------------
pub async fn get_turnos(State(state): State<AppState>) -> Result<Json<Vec<TurnoEntity>>, StatusCode> {
    OrganizacionRepository::listar_turnos(&state.pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_turno(
    State(state): State<AppState>,
    Json(payload): Json<CreateTurnoRequest>,
) -> Result<Json<TurnoEntity>, StatusCode> {
    let entrada = NaiveTime::parse_from_str(&payload.hora_entrada, "%H:%M:%S")
        .or_else(|_| NaiveTime::parse_from_str(&payload.hora_entrada, "%H:%M"))
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let salida = NaiveTime::parse_from_str(&payload.hora_salida, "%H:%M:%S")
        .or_else(|_| NaiveTime::parse_from_str(&payload.hora_salida, "%H:%M"))
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let tolerancia = payload.tolerancia_minutos.unwrap_or(15);
    let dias = payload.dias_laborales.unwrap_or_else(|| "L,M,X,J,V".to_string());

    OrganizacionRepository::crear_turno(
        &state.pool,
        &payload.nombre,
        entrada,
        salida,
        tolerancia,
        &dias,
    )
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
