use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SedeEntity {
    pub id: i32,
    pub codigo: String,
    pub nombre: String,
    pub direccion: Option<String>,
    pub ciudad: Option<String>,
    pub activa: bool,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DepartamentoEntity {
    pub id: i32,
    pub sede_id: i32,
    pub codigo: String,
    pub nombre: String,
    pub activo: bool,
    pub created_at: Option<NaiveDateTime>,
    #[serde(skip_deserializing)]
    pub nombre_sede: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CargoEntity {
    pub id: i32,
    pub departamento_id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    #[serde(skip_deserializing)]
    pub nombre_departamento: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TurnoEntity {
    pub id: i32,
    pub nombre: String,
    pub hora_entrada: NaiveTime,
    pub hora_salida: NaiveTime,
    pub tolerancia_minutos: i32,
    pub dias_laborales: String,
    pub activo: bool,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EmpleadoDetalladoEntity {
    pub cedula: i32,
    pub nombre_completo: String,
    pub email: Option<String>,
    pub telefono: Option<String>,
    pub departamento: String,
    pub sede_id: Option<i32>,
    pub nombre_sede: Option<String>,
    pub departamento_id: Option<i32>,
    pub nombre_departamento: Option<String>,
    pub cargo_id: Option<i32>,
    pub nombre_cargo: Option<String>,
    pub turno_id: Option<i32>,
    pub nombre_turno: Option<String>,
    pub foto_referencial: Option<String>,
    pub template_huella: Option<String>,
    pub activo: bool,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AsistenciaReporteEntity {
    pub empleado_cedula: i32,
    pub nombre_completo: String,
    pub nombre_sede: Option<String>,
    pub nombre_departamento: Option<String>,
    pub nombre_cargo: Option<String>,
    pub fecha: NaiveDate,
    pub hora_entrada: Option<NaiveDateTime>,
    pub hora_salida: Option<NaiveDateTime>,
    pub estado: Option<String>,
    pub minutos_trabajados: i32,
    pub puntualidad: Option<String>,
    pub minutos_retardo: i32,
    pub foto_entrada: Option<String>,
    pub foto_salida: Option<String>,
}
