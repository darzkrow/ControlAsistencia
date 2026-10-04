use chrono::NaiveDateTime;

#[derive(Debug, Clone)]
pub struct Empleado {
    pub cedula: i32,
    pub nombre_completo: String,
    pub departamento: String,
    pub foto_referencial: Option<String>,
    pub template_huella: Option<String>,
    pub activo: bool,
}

#[derive(Debug, Clone)]
pub struct EventoLector {
    pub id: i32,
    pub empleado_cedula: Option<i32>,
    pub fecha_hora: Option<NaiveDateTime>,
    pub tipo_evento: Option<String>,
    pub foto_path: Option<String>,
    pub metodo_auth: Option<String>,
}
