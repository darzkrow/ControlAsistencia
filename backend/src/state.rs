use crate::config::Config;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone, Debug)]
pub struct SessionData {
    pub usuario_id: i32,
    pub username: String,
    pub email: String,
    pub rol_id: i32,
    pub rol_codigo: String,
    pub sede_id: Option<i32>,
    pub expires_at: chrono::NaiveDateTime,
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Arc<Config>,
    pub sessions: Arc<RwLock<HashMap<String, SessionData>>>,
}

impl AppState {
    pub fn new(pool: PgPool, config: Config) -> Self {
        Self {
            pool,
            config: Arc::new(config),
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}
