# Modelo de Datos y Esquema Relacional - Rapture Biometrics PRO 2.0

Este documento contiene la especificacion formal del modelo entidad-relacion, el diccionario de datos y los indices implementados en PostgreSQL 16 para el sistema **Rapture Biometrics PRO 2.0**.

---

## 1. Diagrama de Relaciones de Entidades

```text
+----------------------+         +------------------------+         +---------------------+
|        sedes         | 1     * |     departamentos      | 1     * |       cargos        |
|----------------------|---------|------------------------|---------|---------------------|
| id (PK)              |         | id (PK)                |         | id (PK)             |
| codigo (UNIQUE)      |         | sede_id (FK -> sedes)  |         | departamento_id (FK)|
| nombre               |         | codigo (UNIQUE)        |         | nombre              |
| direccion, ciudad    |         | nombre, activo         |         | descripcion         |
+----------------------+         +------------------------+         +---------------------+
           |                                  |                                |
           | 1                                | 1                              | 1
           |                                  |                                |
           | *                                | *                              | *
+-----------------------------------------------------------------------------------------+
|                                       empleados                                         |
|-----------------------------------------------------------------------------------------|
| cedula (PK INT)                                                                         |
| sede_id (FK -> sedes), departamento_id (FK -> deptos), cargo_id (FK -> cargos)         |
| turno_id (FK -> turnos)                                                                 |
| nombre_completo, email, telefono, departamento                                          |
| foto_referencial, embedding_facial, template_huella, activo, created_at                 |
+-----------------------------------------------------------------------------------------+
           |                                                     |
           | 1                                                   | 1
           |                                                     |
           | *                                                   | *
+----------------------+                              +-----------------------------------+
|    eventos_lector    |                              |          jornada_diaria           |
|----------------------|                              |-----------------------------------|
| id (PK BIGSERIAL)    |                              | empleado_cedula (PK/FK)           |
| empleado_cedula (FK) |                              | fecha (PK DATE)                   |
| fecha_hora           |                              | hora_entrada, hora_salida         |
| tipo_evento          |                              | foto_entrada, foto_salida         |
| foto_path, metodo    |                              | minutos_trabajados, estado        |
+----------------------+                              +-----------------------------------+

===========================================================================================
MODULO DE SEGURIDAD, AUTENTICACION Y CONTROL DE ACCESO POR MODELOS
===========================================================================================

+----------------------+         +--------------------------------------------------------+
|        roles         | 1     * |                  rol_politicas_modelo                  |
|----------------------|---------|--------------------------------------------------------|
| id (PK SERIAL)       |         | id (PK SERIAL)                                         |
| codigo (UNIQUE)      |         | rol_id (FK -> roles.id)                                |
| nombre, descripcion  |         | modelo_codigo (FK -> modelos_recurso.codigo)           |
| es_sistema, activo   |         | puede_crear, puede_leer, puede_actualizar              |
+----------------------+         | puede_eliminar, puede_exportar, alcance                |
           |                     +--------------------------------------------------------+
           | 1                                                ^
           |                                                  | *
           | *                                                | 1
+---------------------------------------+        +----------------------------------------+
|            usuarios_admin             |        |            modelos_recurso             |
|---------------------------------------|        |----------------------------------------|
| id (PK SERIAL)                        |        | codigo (PK VARCHAR(50))                |
| username (UNIQUE), email (UNIQUE)     |        | nombre, descripcion, icono             |
| password_hash (salt$hash)             |        | soporta_alcance_sede                   |
| nombre_completo                       |        | acciones_disponibles                   |
| rol_id (FK -> roles.id)               |        +----------------------------------------+
| sede_id (FK -> sedes.id, NULL=Global) |
| intentos_fallidos, bloqueado_hasta    |
| activo, ultimo_login, created_at      |
+---------------------------------------+
           |
           | 1
           |
           | *
+---------------------------------------+
|          auditoria_seguridad          |
|---------------------------------------|
| id (PK BIGSERIAL)                     |
| usuario_id (FK NULLABLE)              |
| usuario_email, accion, modulo         |
| detalles, ip_origen, fecha_hora       |
+---------------------------------------+
```

---

## 2. Diccionario de Datos

### 2.1 Entidades Organizativas

#### Tabla: `sedes`
Representa las instalaciones fisicas o plantas operativas de la organizacion.
- `id` (SERIAL, PK): Identificador autoincremental unico.
- `codigo` (VARCHAR(30), UNIQUE NOT NULL): Codigo empresarial (ej. `SEDE-CENTRAL`).
- `nombre` (VARCHAR(150) NOT NULL): Denominacion oficial de la instalacion.
- `direccion` (TEXT): Direccion fisica detallada.
- `ciudad` (VARCHAR(100)): Ciudad de localizacion.
- `activa` (BOOLEAN DEFAULT TRUE NOT NULL): Bandera de estado operativo.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Fecha de creacion.

#### Tabla: `departamentos`
Unidades organizativas internas asignadas a una sede especifica.
- `id` (SERIAL, PK): Identificador autoincremental.
- `sede_id` (INT NOT NULL, FK -> `sedes.id`): Sede a la que pertenece la unidad.
- `codigo` (VARCHAR(30), UNIQUE NOT NULL): Codigo interno de identificacion.
- `nombre` (VARCHAR(100) NOT NULL): Nombre del departamento o gerencia.
- `activo` (BOOLEAN DEFAULT TRUE NOT NULL): Estado administrativo.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Marca temporal.

#### Tabla: `cargos`
Definicion de posiciones laborales asociadas a un departamento.
- `id` (SERIAL, PK): Identificador autoincremental.
- `departamento_id` (INT NOT NULL, FK -> `departamentos.id`): Departamento asociado.
- `nombre` (VARCHAR(100) NOT NULL): Titulo o rol de la posicion.
- `descripcion` (TEXT): Alcance y responsabilidades.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Fecha de registro.

#### Tabla: `turnos`
Reglas horarias y politicas de evaluacion de puntualidad.
- `id` (SERIAL, PK): Identificador unico del turno.
- `nombre` (VARCHAR(100) NOT NULL): Nombre descriptivo (ej. `Turno Administrativo Regular`).
- `hora_entrada` (TIME NOT NULL): Hora pactada de inicio de jornada.
- `hora_salida` (TIME NOT NULL): Hora pactada de fin de jornada.
- `tolerancia_minutos` (INT DEFAULT 15 NOT NULL): Margen de gracia antes de aplicar retardo.
- `dias_laborales` (VARCHAR(50) DEFAULT 'L,M,X,J,V' NOT NULL): Dias activos en la semana.
- `activo` (BOOLEAN DEFAULT TRUE NOT NULL): Estado del turno.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Registro temporal.

---

### 2.2 Entidades de Talento Humano y Asistencia

#### Tabla: `empleados`
Directorio principal de colaboradores y sus vectores biometricos.
- `cedula` (INT, PK): Numero de identificacion unico del colaborador.
- `nombre_completo` (VARCHAR(100) NOT NULL): Nombre y apellido oficial.
- `email` (VARCHAR(100)): Correo corporativo.
- `telefono` (VARCHAR(30)): Telefono de contacto.
- `departamento` (VARCHAR(50)): Campo de compatibilidad legada.
- `sede_id` (INT, FK -> `sedes.id`): Asignacion de sede fisica.
- `departamento_id` (INT, FK -> `departamentos.id`): Asignacion departamental.
- `cargo_id` (INT, FK -> `cargos.id`): Asignacion de cargo.
- `turno_id` (INT, FK -> `turnos.id`): Asignacion de turno laboral.
- `foto_referencial` (VARCHAR(255)): Ruta de la foto oficial de perfil.
- `embedding_facial` (BYTEA): Vector numérico de reconocimiento facial 1:1.
- `template_huella` (TEXT): Template de minucias biometricas dactilares.
- `activo` (BOOLEAN DEFAULT TRUE NOT NULL): Habilitacion para marcaje.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Fecha de registro.

#### Tabla: `eventos_lector`
Registro inmutable de cada solicitud de marcaje procesada en los kioskos.
- `id` (BIGSERIAL, PK): Identificador autoincremental de auditoria.
- `empleado_cedula` (INT NOT NULL, FK -> `empleados.cedula`): Colaborador involucrado.
- `fecha_hora` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Momento exacto del evento.
- `tipo_evento` (VARCHAR(20) NOT NULL): `ENTRADA`, `SALIDA`, `VISITANTE` o `RECHAZADO`.
- `foto_path` (VARCHAR(255)): Ruta del archivo de imagen capturado como evidencia.
- `metodo` (VARCHAR(20) DEFAULT 'facial'): Canal utilizado (`facial`, `huella`, `dual`).

#### Tabla: `jornada_diaria`
Consolidacion diaria de asistencias, tiempos y estado laboral por trabajador.
- `empleado_cedula` (INT NOT NULL, FK -> `empleados.cedula`): Colaborador.
- `fecha` (DATE NOT NULL): Dia laboral. Clave primaria compuesta con `empleado_cedula`.
- `hora_entrada` (TIMESTAMP): Primer marcaje del dia.
- `hora_salida` (TIMESTAMP): Ultimo marcaje registrado del dia.
- `foto_entrada` (VARCHAR(255)): Evidencia de entrada.
- `foto_salida` (VARCHAR(255)): Evidencia de salida.
- `minutos_trabajados` (INT DEFAULT 0 NOT NULL): Minutos efectivos acumulados.
- `estado` (VARCHAR(30) DEFAULT 'En curso' NOT NULL): `En curso`, `Completada`, `Incompleta`.
- `ultima_actualizacion` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Ultimo calculo.

---

### 2.3 Entidades de Seguridad y Control de Acceso (RBAC)

#### Tabla: `roles`
Catalogo de perfiles de usuario administrativo en el sistema.
- `id` (SERIAL, PK): Identificador autoincremental del rol.
- `codigo` (VARCHAR(50), UNIQUE NOT NULL): `SUPER_ADMIN`, `ADMIN_RRHH`, `SUPERVISOR_SEDE`, `AUDITOR`.
- `nombre` (VARCHAR(100) NOT NULL): Titulo legible del rol.
- `descripcion` (TEXT): Alcance y descripcion de funciones.
- `es_sistema` (BOOLEAN DEFAULT FALSE NOT NULL): Protege los roles predefinidos contra borrado.
- `activo` (BOOLEAN DEFAULT TRUE NOT NULL): Estado del rol.

#### Tabla: `modelos_recurso`
Registro de modelos de negocio o dominios sujetos a gobernanza y permisos.
- `codigo` (VARCHAR(50), PK): Clave unica del modelo (`sedes`, `departamentos`, `cargos`, `turnos`, `empleados`, `asistencias`, `seguridad`).
- `nombre` (VARCHAR(100) NOT NULL): Denominacion del modelo.
- `descripcion` (TEXT): Finalidad operativa del recurso.
- `icono` (VARCHAR(50)): Nombre del identificador de icono para el frontend.
- `soporta_alcance_sede` (BOOLEAN DEFAULT FALSE NOT NULL): Define si el modelo puede restringirse por sede fisica.
- `acciones_disponibles` (VARCHAR(100) NOT NULL): Lista separada por comas (`crear,leer,actualizar,eliminar,exportar`).

#### Tabla: `rol_politicas_modelo`
Matriz de permisos que vincula roles con modelos de recurso y niveles de autorizacion.
- `id` (SERIAL, PK): Identificador autoincremental.
- `rol_id` (INT NOT NULL, FK -> `roles.id` ON DELETE CASCADE): Rol asignado.
- `modelo_codigo` (VARCHAR(50) NOT NULL, FK -> `modelos_recurso.codigo` ON DELETE CASCADE): Modelo objetivo.
- `puede_crear` (BOOLEAN DEFAULT FALSE NOT NULL): Autorizacion para operaciones de insercion.
- `puede_leer` (BOOLEAN DEFAULT TRUE NOT NULL): Autorizacion para consultas de lectura.
- `puede_actualizar` (BOOLEAN DEFAULT FALSE NOT NULL): Autorizacion para modificaciones.
- `puede_eliminar` (BOOLEAN DEFAULT FALSE NOT NULL): Autorizacion para borrado.
- `puede_exportar` (BOOLEAN DEFAULT FALSE NOT NULL): Autorizacion para descargas y reportes.
- `alcance` (VARCHAR(20) DEFAULT 'global' NOT NULL): Nivel de visibilidad (`global`, `sede`, `ninguno`).

#### Tabla: `usuarios_admin`
Cuentas de usuario autorizadas para ingresar al Portal de Administracion.
- `id` (SERIAL, PK): Identificador autoincremental.
- `username` (VARCHAR(50), UNIQUE NOT NULL): Identificador de login.
- `email` (VARCHAR(100), UNIQUE NOT NULL): Correo electronico.
- `password_hash` (VARCHAR(255) NOT NULL): Hash seguro en formato `{salt}${hash}` (SHA-256).
- `nombre_completo` (VARCHAR(100) NOT NULL): Nombre del titular.
- `rol_id` (INT NOT NULL, FK -> `roles.id`): Perfil de seguridad asignado.
- `sede_id` (INT, FK -> `sedes.id`): Sede de asignacion (NULL si el rol tiene alcance global).
- `intentos_fallidos` (INT DEFAULT 0 NOT NULL): Contador para politica de fuerza bruta.
- `bloqueado_hasta` (TIMESTAMP): Marca temporal hasta la que rige el bloqueo temporal.
- `activo` (BOOLEAN DEFAULT TRUE NOT NULL): Estado de la cuenta.
- `ultimo_login` (TIMESTAMP): Registro de la sesion mas reciente.
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Fecha de creacion.

#### Tabla: `auditoria_seguridad`
Bitacora inmutable para rastreo forense de eventos de seguridad y gobernanza.
- `id` (BIGSERIAL, PK): Identificador autoincremental.
- `usuario_id` (INT, FK -> `usuarios_admin.id` ON DELETE SET NULL): Usuario actor (si aplica).
- `usuario_email` (VARCHAR(100)): Correo o identificador suministrado.
- `accion` (VARCHAR(50) NOT NULL): `LOGIN_EXITOSO`, `LOGIN_FALLIDO`, `CREAR_USUARIO`, `ACTUALIZAR_POLITICAS`, etc.
- `modulo` (VARCHAR(50) NOT NULL): Modulo impactado (`AUTH`, `SEGURIDAD`, `MODELOS`, `EMPLEADOS`).
- `detalles` (TEXT): Descripcion contextual del evento.
- `ip_origen` (VARCHAR(45)): Direccion IP del cliente.
- `fecha_hora` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL): Marca temporal inmutable.

---

## 3. Indices de Rendimiento Recomendados

```sql
CREATE INDEX IF NOT EXISTS idx_empleados_sede_depto ON public.empleados (sede_id, departamento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_lector_cedula_fecha ON public.eventos_lector (empleado_cedula, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_jornada_diaria_fecha ON public.jornada_diaria (fecha);
CREATE INDEX IF NOT EXISTS idx_usuarios_admin_username ON public.usuarios_admin (username);
CREATE INDEX IF NOT EXISTS idx_usuarios_admin_email ON public.usuarios_admin (email);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_hora ON public.auditoria_seguridad (fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_politicas_rol_modelo ON public.rol_politicas_modelo (rol_id, modelo_codigo);
```
