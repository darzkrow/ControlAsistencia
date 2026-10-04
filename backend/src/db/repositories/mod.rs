pub mod asistencia_repo;
pub mod empleado_repo;
pub mod organizacion_repo;
pub mod seguridad;

pub use asistencia_repo::AsistenciaRepository;
pub use empleado_repo::EmpleadoRepository;
pub use organizacion_repo::OrganizacionRepository;
pub use seguridad::SeguridadRepository;
