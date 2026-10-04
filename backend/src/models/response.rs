use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct EscaneoResponse {
    pub es_empleado: bool,
    pub mensaje: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nombre_completo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub departamento: Option<String>,
    pub tipo_evento: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub foto_detectada_b64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minutos_acumulados: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hora_evento: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub timestamp: String,
}
