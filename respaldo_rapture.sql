-- ==============================================================================
-- Esquema Integral de Base de Datos - Rapture Biometrics
-- Incluye Estructura Organizativa Dinámica (Sedes, Departamentos, Cargos, Turnos),
-- Gestión de Empleados, Auditoría de Eventos y Evaluación de Asistencia Diaria.
-- ==============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET row_security = off;

-- ------------------------------------------------------------------------------
-- 1. SEDES (Ubicaciones Físicas y Sucursales)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sedes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    activa BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. DEPARTAMENTOS (Áreas por Sede)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departamentos (
    id SERIAL PRIMARY KEY,
    sede_id INTEGER NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sede_depto UNIQUE (sede_id, codigo)
);

-- ------------------------------------------------------------------------------
-- 3. CARGOS (Posiciones y Roles de Trabajo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cargos (
    id SERIAL PRIMARY KEY,
    departamento_id INTEGER NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. TURNOS Y HORARIOS LABORALES (Reglas de Evaluación de Asistencia)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.turnos_horarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    tolerancia_minutos INTEGER DEFAULT 15 NOT NULL,
    dias_laborales VARCHAR(50) DEFAULT 'L,M,X,J,V' NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. EMPLEADOS (Colaboradores vinculados a la Organización y Biometría)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empleados (
    cedula INTEGER PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(50),
    departamento VARCHAR(50) NOT NULL, -- Compatible con esquema previo
    sede_id INTEGER REFERENCES public.sedes(id) ON DELETE SET NULL,
    departamento_id INTEGER REFERENCES public.departamentos(id) ON DELETE SET NULL,
    cargo_id INTEGER REFERENCES public.cargos(id) ON DELETE SET NULL,
    turno_id INTEGER REFERENCES public.turnos_horarios(id) ON DELETE SET NULL,
    foto_referencial VARCHAR(255),
    template_huella TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. EVENTOS DE LECTURA (Log Inmutable de Auditoría Biometría)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eventos_lector (
    id SERIAL PRIMARY KEY,
    empleado_cedula INTEGER REFERENCES public.empleados(cedula) ON DELETE CASCADE,
    fecha_hora TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tipo_evento VARCHAR(20) DEFAULT 'ENTRADA' NOT NULL,
    foto_path VARCHAR(255),
    metodo_auth VARCHAR(20) DEFAULT 'FACIAL' NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. JORNADA DIARIA (Cálculo, Puntualidad y Evaluación de Asistencia)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jornada_diaria (
    empleado_cedula INTEGER NOT NULL REFERENCES public.empleados(cedula) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    hora_entrada TIMESTAMP WITHOUT TIME ZONE,
    hora_salida TIMESTAMP WITHOUT TIME ZONE,
    estado VARCHAR(30) DEFAULT 'En curso',
    foto_entrada VARCHAR(255),
    foto_salida VARCHAR(255),
    minutos_trabajados INTEGER DEFAULT 0 NOT NULL,
    puntualidad VARCHAR(30) DEFAULT 'En curso', -- 'Puntual', 'Retardo', 'Salida Temprana', 'Completada'
    minutos_retardo INTEGER DEFAULT 0 NOT NULL,
    ultima_actualizacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (empleado_cedula, fecha)
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_empleados_sede ON public.empleados(sede_id);
CREATE INDEX IF NOT EXISTS idx_empleados_depto ON public.empleados(departamento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_lector_fecha ON public.eventos_lector(empleado_cedula, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_jornada_fecha ON public.jornada_diaria(fecha, empleado_cedula);

-- ==============================================================================
-- DATOS SEMILLA INICIALES (Estructura Organizativa Dinámica)
-- ==============================================================================

-- 1. Sedes
INSERT INTO public.sedes (id, codigo, nombre, direccion, ciudad, activa) VALUES
(1, 'SEDE-CENTRAL', 'Sede Central Administrativa', 'Av. Libertador, Edif. Rapture Towers', 'Caracas', true),
(2, 'SEDE-NORTE', 'Planta Tecnológica e I+D', 'Parque Industrial Norte, Módulo B', 'Valencia', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Departamentos
INSERT INTO public.departamentos (id, sede_id, codigo, nombre, activo) VALUES
(1, 1, 'DEP-ESTAD', 'Gerencia de Estadística', true),
(2, 1, 'DEP-RRHH', 'Recursos Humanos', true),
(3, 2, 'DEP-TI', 'Tecnología e Informática', true),
(4, 2, 'DEP-OP', 'Operaciones y Logística', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Cargos
INSERT INTO public.cargos (id, departamento_id, nombre, descripcion) VALUES
(1, 1, 'Especialista de Estadísticas y Análisis', 'Análisis métrico y modelos de datos'),
(2, 2, 'Coordinadora de Recursos Humanos', 'Gestión de nómina, contrataciones y bienestar'),
(3, 3, 'Ingeniero de Infraestructura y Software', 'Desarrollo, nube y ciberseguridad'),
(4, 4, 'Supervisor de Operaciones Biométricas', 'Control de planta y soporte técnico de kioskos')
ON CONFLICT (id) DO NOTHING;

-- 4. Turnos Horarios
INSERT INTO public.turnos_horarios (id, nombre, hora_entrada, hora_salida, tolerancia_minutos, dias_laborales, activo) VALUES
(1, 'Turno Administrativo Regular', '08:00:00', '17:00:00', 15, 'L,M,X,J,V', true),
(2, 'Turno Técnico Matutino', '07:00:00', '15:30:00', 10, 'L,M,X,J,V', true),
(3, 'Turno Tarde / Operativo', '13:00:00', '21:00:00', 15, 'L,M,X,J,V', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Empleados Iniciales (con vinculación a la estructura organizativa)
INSERT INTO public.empleados (cedula, nombre_completo, email, telefono, departamento, sede_id, departamento_id, cargo_id, turno_id, foto_referencial, activo) VALUES
(22789456, 'Juan Carlos Pérez Gómez', 'jperez@rapture.corp', '+58 412 1112233', 'Gerencia de estadística', 1, 1, 1, 1, '/fotos/ref/22789456.jpg', true),
(19543210, 'María Alejandra Rodríguez', 'mrodriguez@rapture.corp', '+58 414 3334455', 'Recursos Humanos', 1, 2, 2, 1, '/fotos/ref/19543210.jpg', true),
(25111222, 'Carlos Eduardo Mendoza', 'cmendoza@rapture.corp', '+58 424 5556677', 'Tecnología e Informática', 2, 3, 3, 2, '/fotos/ref/25111222.jpg', true)
ON CONFLICT (cedula) DO UPDATE SET 
    sede_id = EXCLUDED.sede_id,
    departamento_id = EXCLUDED.departamento_id,
    cargo_id = EXCLUDED.cargo_id,
    turno_id = EXCLUDED.turno_id;

-- Ajustar secuencias de seriales
SELECT setval('public.sedes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.sedes));
SELECT setval('public.departamentos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.departamentos));
SELECT setval('public.cargos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.cargos));
SELECT setval('public.turnos_horarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.turnos_horarios));

-- ==============================================================================
-- 8. SEGURIDAD, RBAC Y GESTIÓN DE MODELOS
-- ==============================================================================

-- 8.1 Roles de Seguridad Administrativa
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    es_sistema BOOLEAN DEFAULT false NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8.2 Catálogo de Modelos y Recursos del Sistema
CREATE TABLE IF NOT EXISTS public.modelos_recurso (
    codigo VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50) DEFAULT 'Database' NOT NULL,
    soporta_alcance_sede BOOLEAN DEFAULT true NOT NULL,
    acciones_disponibles VARCHAR(100) DEFAULT 'crear,leer,actualizar,eliminar,exportar' NOT NULL
);

-- 8.3 Políticas de Acceso por Modelo y Rol
CREATE TABLE IF NOT EXISTS public.rol_politicas_modelo (
    id SERIAL PRIMARY KEY,
    rol_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    modelo_codigo VARCHAR(50) NOT NULL REFERENCES public.modelos_recurso(codigo) ON DELETE CASCADE,
    puede_crear BOOLEAN DEFAULT false NOT NULL,
    puede_leer BOOLEAN DEFAULT true NOT NULL,
    puede_actualizar BOOLEAN DEFAULT false NOT NULL,
    puede_eliminar BOOLEAN DEFAULT false NOT NULL,
    puede_exportar BOOLEAN DEFAULT false NOT NULL,
    alcance VARCHAR(30) DEFAULT 'global' NOT NULL, -- 'global' | 'sede' | 'ninguno'
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rol_modelo UNIQUE (rol_id, modelo_codigo)
);

-- 8.4 Usuarios Administrativos
CREATE TABLE IF NOT EXISTS public.usuarios_admin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    sede_id INTEGER REFERENCES public.sedes(id) ON DELETE SET NULL,
    intentos_fallidos INTEGER DEFAULT 0 NOT NULL,
    bloqueado_hasta TIMESTAMP WITHOUT TIME ZONE,
    activo BOOLEAN DEFAULT true NOT NULL,
    ultimo_login TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8.5 Pista de Auditoría de Seguridad (Security Audit Trail)
CREATE TABLE IF NOT EXISTS public.auditoria_seguridad (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES public.usuarios_admin(id) ON DELETE SET NULL,
    usuario_email VARCHAR(100),
    accion VARCHAR(100) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    detalles TEXT,
    ip_origen VARCHAR(45) DEFAULT '127.0.0.1',
    fecha_hora TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de seguridad
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios_admin(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_sede ON public.usuarios_admin(sede_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_seg_fecha ON public.auditoria_seguridad(fecha_hora DESC);

-- ==============================================================================
-- DATOS SEMILLA DE SEGURIDAD, MODELOS Y ROLES
-- ==============================================================================

-- 1. Catálogo de Modelos Registrados
INSERT INTO public.modelos_recurso (codigo, nombre, descripcion, icono, soporta_alcance_sede, acciones_disponibles) VALUES
('sedes', 'Sedes y Sucursales', 'Ubicaciones físicas y arquitectura de campus', 'Building2', false, 'crear,leer,actualizar,eliminar'),
('departamentos', 'Departamentos y Oficinas', 'Unidades organizativas internas por sede', 'Layers', true, 'crear,leer,actualizar,eliminar'),
('cargos', 'Cargos y Posiciones', 'Definición de roles de trabajo y perfiles', 'Briefcase', false, 'crear,leer,actualizar,eliminar'),
('turnos', 'Turnos y Horarios', 'Reglas de evaluación, tolerancias y jornadas', 'Clock', false, 'crear,leer,actualizar,eliminar'),
('empleados', 'Colaboradores y Biometría', 'Directorio, enrolamiento facial y huellas dactilares', 'Users', true, 'crear,leer,actualizar,eliminar,exportar'),
('asistencias', 'Auditoría de Asistencias', 'Control de marcaciones, retardos y reportes', 'CalendarCheck', true, 'leer,exportar'),
('seguridad', 'Seguridad, Roles y Políticas', 'Gestión de usuarios admin, políticas RBAC y modelos', 'Shield', false, 'crear,leer,actualizar,eliminar,exportar')
ON CONFLICT (codigo) DO NOTHING;

-- 2. Roles del Sistema
INSERT INTO public.roles (id, codigo, nombre, descripcion, es_sistema, activo) VALUES
(1, 'SUPER_ADMIN', 'Super Administrador', 'Control total e irrestricto sobre todos los modelos del sistema', true, true),
(2, 'ADMIN_RRHH', 'Administrador de Talento Humano', 'Gestión integral de colaboradores, turnos, cargos y auditoría de asistencias', true, true),
(3, 'SUPERVISOR_SEDE', 'Supervisor de Sede Local', 'Gestión y control de colaboradores restringido a la sede asignada', true, true),
(4, 'AUDITOR', 'Auditor de Seguridad y Cumplimiento', 'Solo lectura y exportación para fines de fiscalización', true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Acceso por Modelo para cada Rol
-- SUPER_ADMIN: Acceso total a todo con alcance 'global'
INSERT INTO public.rol_politicas_modelo (rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar, puede_eliminar, puede_exportar, alcance) VALUES
(1, 'sedes', true, true, true, true, true, 'global'),
(1, 'departamentos', true, true, true, true, true, 'global'),
(1, 'cargos', true, true, true, true, true, 'global'),
(1, 'turnos', true, true, true, true, true, 'global'),
(1, 'empleados', true, true, true, true, true, 'global'),
(1, 'asistencias', true, true, true, true, true, 'global'),
(1, 'seguridad', true, true, true, true, true, 'global')
ON CONFLICT (rol_id, modelo_codigo) DO NOTHING;

-- ADMIN_RRHH: Todo en personal, organización y asistencia (sin administración de seguridad)
INSERT INTO public.rol_politicas_modelo (rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar, puede_eliminar, puede_exportar, alcance) VALUES
(2, 'sedes', false, true, false, false, false, 'global'),
(2, 'departamentos', true, true, true, false, true, 'global'),
(2, 'cargos', true, true, true, false, true, 'global'),
(2, 'turnos', true, true, true, false, true, 'global'),
(2, 'empleados', true, true, true, false, true, 'global'),
(2, 'asistencias', false, true, false, false, true, 'global'),
(2, 'seguridad', false, false, false, false, false, 'ninguno')
ON CONFLICT (rol_id, modelo_codigo) DO NOTHING;

-- SUPERVISOR_SEDE: Limitado a su sede asignada
INSERT INTO public.rol_politicas_modelo (rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar, puede_eliminar, puede_exportar, alcance) VALUES
(3, 'sedes', false, true, false, false, false, 'sede'),
(3, 'departamentos', false, true, false, false, false, 'sede'),
(3, 'cargos', false, true, false, false, false, 'global'),
(3, 'turnos', false, true, false, false, false, 'global'),
(3, 'empleados', true, true, true, false, true, 'sede'),
(3, 'asistencias', false, true, false, false, true, 'sede'),
(3, 'seguridad', false, false, false, false, false, 'ninguno')
ON CONFLICT (rol_id, modelo_codigo) DO NOTHING;

-- AUDITOR: Solo lectura y exportación
INSERT INTO public.rol_politicas_modelo (rol_id, modelo_codigo, puede_crear, puede_leer, puede_actualizar, puede_eliminar, puede_exportar, alcance) VALUES
(4, 'sedes', false, true, false, false, true, 'global'),
(4, 'departamentos', false, true, false, false, true, 'global'),
(4, 'cargos', false, true, false, false, true, 'global'),
(4, 'turnos', false, true, false, false, true, 'global'),
(4, 'empleados', false, true, false, false, true, 'global'),
(4, 'asistencias', false, true, false, false, true, 'global'),
(4, 'seguridad', false, true, false, false, true, 'global')
ON CONFLICT (rol_id, modelo_codigo) DO NOTHING;

-- 4. Usuarios Administradores Iniciales (Password hash SHA-256 de 'Admin2026!*' y 'RapturePass123')
INSERT INTO public.usuarios_admin (id, username, email, password_hash, nombre_completo, rol_id, sede_id, activo) VALUES
(1, 'admin', 'admin@rapture.corp', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Administrador Principal de Seguridad', 1, NULL, true),
(2, 'rrhh_directora', 'rrhh@rapture.corp', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Dirección de Talento Humano', 2, 1, true),
(3, 'supervisor_norte', 'supervisor.valencia@rapture.corp', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Supervisor Planta Norte', 3, 2, true),
(4, 'auditor_externo', 'auditor@rapture.corp', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Auditor de Cumplimiento Normativo', 4, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Semilla de Auditoría de Seguridad
INSERT INTO public.auditoria_seguridad (usuario_id, usuario_email, accion, modulo, detalles) VALUES
(1, 'admin@rapture.corp', 'INICIALIZACION_SISTEMA', 'SEGURIDAD', 'Instalación de políticas RBAC y modelos de recursos base'),
(1, 'admin@rapture.corp', 'CONFIGURACION_POLITICAS', 'MODELOS', 'Definición de alcance y permisos matriciales para 4 roles')
ON CONFLICT (id) DO NOTHING;

-- Ajustar secuencias
SELECT setval('public.roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.roles));
SELECT setval('public.rol_politicas_modelo_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.rol_politicas_modelo));
SELECT setval('public.usuarios_admin_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.usuarios_admin));
SELECT setval('public.auditoria_seguridad_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.auditoria_seguridad));

