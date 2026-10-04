use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EventoLectorEntity {
    pub id: i32,
    pub empleado_cedula: Option<i32>,
    pub fecha_hora: Option<NaiveDateTime>,
    pub tipo_evento: Option<String>,
    pub foto_path: Option<String>,
    pub metodo_auth: Option<String>,
}
