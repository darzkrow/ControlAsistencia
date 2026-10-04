use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct JornadaDiariaEntity {
    pub empleado_cedula: i32,
    pub fecha: NaiveDate,
    pub hora_entrada: Option<NaiveDateTime>,
    pub hora_salida: Option<NaiveDateTime>,
    pub estado: Option<String>,
    pub foto_entrada: Option<String>,
    pub foto_salida: Option<String>,
    pub minutos_trabajados: i32,
    pub ultima_actualizacion: Option<NaiveDateTime>,
}
