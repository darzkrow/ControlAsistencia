use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RolEntity {
    pub id: i32,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub es_sistema: bool,
    pub activo: bool,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModeloRecursoEntity {
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub icono: String,
    pub soporta_alcance_sede: bool,
    pub acciones_disponibles: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RolPoliticaModeloEntity {
    pub id: i32,
    pub rol_id: i32,
    pub modelo_codigo: String,
    pub puede_crear: bool,
    pub puede_leer: bool,
    pub puede_actualizar: bool,
    pub puede_eliminar: bool,
    pub puede_exportar: bool,
    pub alcance: String, // 'global' | 'sede' | 'ninguno'
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsuarioAdminEntity {
    pub id: i32,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub nombre_completo: String,
    pub rol_id: i32,
    pub sede_id: Option<i32>,
    pub intentos_fallidos: i32,
    pub bloqueado_hasta: Option<NaiveDateTime>,
    pub activo: bool,
    pub ultimo_login: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsuarioDetalladoEntity {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub nombre_completo: String,
    pub rol_id: i32,
    pub rol_codigo: String,
    pub rol_nombre: String,
    pub sede_id: Option<i32>,
    pub sede_nombre: Option<String>,
    pub intentos_fallidos: i32,
    pub bloqueado_hasta: Option<NaiveDateTime>,
    pub activo: bool,
    pub ultimo_login: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditoriaSeguridadEntity {
    pub id: i32,
    pub usuario_id: Option<i32>,
    pub usuario_email: Option<String>,
    pub accion: String,
    pub modulo: String,
    pub detalles: Option<String>,
    pub ip_origen: Option<String>,
    pub fecha_hora: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub usuario: UsuarioDetalladoEntity,
    pub politicas: Vec<RolPoliticaModeloEntity>,
}
