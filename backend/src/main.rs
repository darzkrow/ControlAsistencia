mod config;
mod db;
mod handlers;
mod models;
mod services;
mod state;

use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post, put},
    Router,
};
use config::Config;
use db::DatabasePoolManager;
use dotenvy::dotenv;
use handlers::{
    admin_reset_password_handler, create_cargo, create_departamento, create_empleado,
    create_role_handler, create_sede, create_turno, create_usuario_handler, escaneo_handler,
    get_auditoria_handler, get_cargos, get_dashboard_metricas, get_departamentos, get_empleados,
    get_modelos_handler, get_reporte_asistencias, get_rol_politicas_handler, get_roles_handler,
    get_sedes, get_turnos, get_usuarios_handler, health_handler, login_handler, logout_handler,
    register_handler, reset_password_handler, toggle_empleado_estado,
    toggle_usuario_estado_handler, unlock_usuario_handler, update_rol_politicas_handler,
};
use state::AppState;
use std::fs;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    dotenv().ok();

    // 1. Cargar configuración tipada desde variables de entorno
    let config = Config::from_env();

    // 2. Asegurar existencia de directorio de almacenamiento de capturas
    fs::create_dir_all("uploads/fotos/ref").ok();

    // 3. Inicializar pool de conexiones SQL aplicando políticas de Sizing, Timeouts y Resiliencia
    let pool = DatabasePoolManager::create_pool(&config)
        .await
        .expect("Error crítico al inicializar el pool de conexiones SQL con PostgreSQL");

    // 4. Configurar capas de seguridad (CORS y límite de tamaño de payload)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let max_body_limit = config.max_body_limit_bytes;
    let server_addr = config.server_addr;

    // 5. Estado de la aplicación inyectable con pool y configuración centralizada
    let state = AppState::new(pool, config);

    // 6. Construir Router de Axum con rutas de Kiosko y Portal Administrativo
    let app = Router::new()
        // Rutas del Kiosko Biométrico
        .route("/api/health", get(health_handler))
        .route("/api/escaneo", post(escaneo_handler))
        // Rutas del Portal Administrativo - Métricas
        .route("/api/admin/dashboard", get(get_dashboard_metricas))
        // Rutas del Portal Administrativo - Estructura Organizativa
        .route("/api/admin/sedes", get(get_sedes).post(create_sede))
        .route("/api/admin/departamentos", get(get_departamentos).post(create_departamento))
        .route("/api/admin/cargos", get(get_cargos).post(create_cargo))
        .route("/api/admin/turnos", get(get_turnos).post(create_turno))
        // Rutas del Portal Administrativo - Gestión de Empleados
        .route("/api/admin/empleados", get(get_empleados).post(create_empleado))
        .route("/api/admin/empleados/:cedula/estado", post(toggle_empleado_estado))
        // Rutas del Portal Administrativo - Auditoría y Evaluación de Asistencia
        .route("/api/admin/asistencias", get(get_reporte_asistencias))
        // Rutas de Autenticación y Seguridad
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/logout", post(logout_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/reset-password", post(reset_password_handler))
        // Rutas del Portal Administrativo - Gestión de Roles y Permisos
        .route("/api/admin/seguridad/roles", get(get_roles_handler).post(create_role_handler))
        .route("/api/admin/seguridad/modelos", get(get_modelos_handler))
        .route("/api/admin/seguridad/roles/:id/politicas", get(get_rol_politicas_handler).put(update_rol_politicas_handler))
        .route("/api/admin/seguridad/usuarios", get(get_usuarios_handler).post(create_usuario_handler))
        .route("/api/admin/seguridad/usuarios/:id/estado", post(toggle_usuario_estado_handler))
        .route("/api/admin/seguridad/usuarios/:id/desbloquear", post(unlock_usuario_handler))
        .route("/api/admin/seguridad/usuarios/:id/reset-password", post(admin_reset_password_handler))
        .route("/api/admin/seguridad/auditoria", get(get_auditoria_handler))
        .layer(DefaultBodyLimit::max(max_body_limit))
        .layer(cors)
        .with_state(state);

    println!("Servidor Biométrico y Portal Administrativo Rapture en http://{}", server_addr);

    // 7. Enlazar socket TCP e iniciar servidor asíncrono
    let listener = tokio::net::TcpListener::bind(server_addr)
        .await
        .expect("Error al enlazar el puerto TCP del servidor");

    axum::serve(listener, app)
        .await
        .expect("Error en el runtime del servidor Axum");
}
