use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EmpleadoEntity {
    pub cedula: i32,
    pub nombre_completo: String,
    pub departamento: String,
    pub foto_referencial: Option<String>,
    pub template_huella: Option<String>,
    pub activo: bool,
}
