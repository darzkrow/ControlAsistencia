use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct EscaneoRequest {
    pub cedula: i32,
    pub foto_b64: Option<String>,
    pub huella_b64: Option<String>,
    pub metodo: Option<String>,
}
