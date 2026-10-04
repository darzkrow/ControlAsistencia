use crate::config::Config;
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;
use tokio::time::sleep;

/// Gestor y fábrica del Pool de Conexiones SQL.
/// Aplica políticas estrictas de:
/// 1. Sizing y Elasticidad (min_connections / max_connections).
/// 2. Prevención de fugas y bloqueos (acquire_timeout).
/// 3. Higiene de sockets y reciclaje (idle_timeout / max_lifetime).
/// 4. Validación antes de préstamo (test_before_acquire).
/// 5. Resiliencia ante fallos con reintentos y retroceso exponencial (Exponential Backoff).
pub struct DatabasePoolManager;

impl DatabasePoolManager {
    pub async fn create_pool(config: &Config) -> Result<PgPool, sqlx::Error> {
        let max_retries = 5;
        let mut retry_delay = Duration::from_millis(500);

        println!(
            "[INFO] Inicializando Pool de Conexiones SQL [Min: {}, Max: {}, AcquireTimeout: {:?}]...",
            config.db_min_connections, config.db_max_connections, config.db_acquire_timeout
        );

        let pool_options = PgPoolOptions::new()
            // POLITICA: Tamano maximo del pool para no saturar los procesos de PostgreSQL
            .max_connections(config.db_max_connections)
            // POLITICA: Conexiones minimas precalentadas (Warm Pool) para eliminar latencia en frio
            .min_connections(config.db_min_connections)
            // POLITICA: Timeout de adquisicion para evitar que hilos queden colgados indefinidamente
            .acquire_timeout(config.db_acquire_timeout)
            // POLITICA: Cierre automatico de conexiones ociosas para liberar RAM en la base de datos
            .idle_timeout(config.db_idle_timeout)
            // POLITICA: Vida util maxima de una conexion para reciclar sockets y evitar conexiones zombies
            .max_lifetime(config.db_max_lifetime)
            // POLITICA: Verificar que la conexion sigue viva antes de entregarla al handler
            .test_before_acquire(true);

        for attempt in 1..=max_retries {
            match pool_options.connect(&config.database_url).await {
                Ok(pool) => {
                    println!("[INFO] Pool de conexiones SQL conectado exitosamente.");
                    return Ok(pool);
                }
                Err(err) => {
                    eprintln!(
                        "[WARN] Intento {}/{} fallido al conectar con PostgreSQL: {}. Reintentando en {:?}...",
                        attempt, max_retries, err, retry_delay
                    );
                    if attempt == max_retries {
                        return Err(err);
                    }
                    sleep(retry_delay).await;
                    retry_delay *= 2; // Retroceso exponencial
                }
            }
        }

        unreachable!()
    }
}
