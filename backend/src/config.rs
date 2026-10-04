use std::env;
use std::net::SocketAddr;
use std::time::Duration;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub server_addr: SocketAddr,
    pub max_body_limit_bytes: usize,
    pub cooldown_seconds: i64,

    // Políticas de Pool de Conexiones SQL / ORM
    pub db_max_connections: u32,
    pub db_min_connections: u32,
    pub db_acquire_timeout: Duration,
    pub db_idle_timeout: Duration,
    pub db_max_lifetime: Duration,
}

impl Config {
    pub fn from_env() -> Self {
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://admin:secreto@localhost:5432/api_db".to_string());

        let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = env::var("SERVER_PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()
            .unwrap_or(3000);

        let ip = host.parse().unwrap_or([127, 0, 0, 1].into());
        let server_addr = SocketAddr::new(ip, port);

        let max_body_limit_bytes = env::var("MAX_BODY_LIMIT_MB")
            .unwrap_or_else(|_| "15".to_string())
            .parse::<usize>()
            .unwrap_or(15)
            * 1024
            * 1024;

        let cooldown_seconds = env::var("COOLDOWN_SECONDS")
            .unwrap_or_else(|_| "15".to_string())
            .parse::<i64>()
            .unwrap_or(15);

        // Políticas de Conexión SQL
        let db_max_connections = env::var("DB_MAX_CONNECTIONS")
            .unwrap_or_else(|_| "20".to_string())
            .parse::<u32>()
            .unwrap_or(20);

        let db_min_connections = env::var("DB_MIN_CONNECTIONS")
            .unwrap_or_else(|_| "5".to_string())
            .parse::<u32>()
            .unwrap_or(5);

        let db_acquire_timeout = Duration::from_secs(
            env::var("DB_ACQUIRE_TIMEOUT_SECS")
                .unwrap_or_else(|_| "5".to_string())
                .parse::<u64>()
                .unwrap_or(5),
        );

        let db_idle_timeout = Duration::from_secs(
            env::var("DB_IDLE_TIMEOUT_SECS")
                .unwrap_or_else(|_| "600".to_string())
                .parse::<u64>()
                .unwrap_or(600),
        );

        let db_max_lifetime = Duration::from_secs(
            env::var("DB_MAX_LIFETIME_SECS")
                .unwrap_or_else(|_| "1800".to_string())
                .parse::<u64>()
                .unwrap_or(1800),
        );

        Self {
            database_url,
            server_addr,
            max_body_limit_bytes,
            cooldown_seconds,
            db_max_connections,
            db_min_connections,
            db_acquire_timeout,
            db_idle_timeout,
            db_max_lifetime,
        }
    }
}
