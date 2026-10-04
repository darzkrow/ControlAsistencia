use crate::db::entities::AsistenciaReporteEntity;
use crate::db::repositories::{asistencia_repo::DashboardMetrics, AsistenciaRepository};
use crate::state::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct ReporteFilter {
    pub fecha_desde: Option<String>,
    pub fecha_hasta: Option<String>,
    pub sede_id: Option<i32>,
    pub departamento_id: Option<i32>,
}

pub async fn get_reporte_asistencias(
    State(state): State<AppState>,
    Query(filter): Query<ReporteFilter>,
) -> Result<Json<Vec<AsistenciaReporteEntity>>, StatusCode> {
    let f_desde = filter
        .fecha_desde
        .as_deref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    let f_hasta = filter
        .fecha_hasta
        .as_deref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    AsistenciaRepository::generar_reporte(
        &state.pool,
        f_desde,
        f_hasta,
        filter.sede_id,
        filter.departamento_id,
    )
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_dashboard_metricas(
    State(state): State<AppState>,
) -> Result<Json<DashboardMetrics>, StatusCode> {
    AsistenciaRepository::obtener_metricas(&state.pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
