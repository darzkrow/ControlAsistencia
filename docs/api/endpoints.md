# Catalogo de Endpoints REST - Rapture Biometrics PRO 2.0

Este documento contiene la especificacion tecnica completa de la API REST para el Kiosko Biometrico y el Portal Administrativo.

- **Base URL:** `http://127.0.0.1:3000` (Directo) o `/api` (A traves del proxy de Vite en desarrollo).
- **Formato:** JSON (`Content-Type: application/json`).
- **Autenticacion:** Cabecera `Authorization: Bearer <token>` requerida para rutas administrativas.

---

## 1. Servicios Publicos y de Salud

### 1.1 Verificacion de Estado de Salud
Verifica la disponibilidad del backend y la conexion con el motor.
- **Ruta:** `GET /api/health`
- **Autenticacion:** No requerida.
- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "status": "ok",
    "service": "rapture-biometrics-backend",
    "engine": "Axum / Bridge",
    "version": "2.0.4",
    "server_connected": true,
    "timestamp": "2026-10-04T17:40:00.000Z"
  }
  ```

---

## 2. Kiosko Biometrico

### 2.1 Registro de Marcaje / Escaneo
Procesa la verificacion de identidad por cedula, fotografia facial o huella dactilar.
- **Ruta:** `POST /api/escaneo`
- **Autenticacion:** No requerida (Acceso Kiosko).
- **Cuerpo de Peticion:**
  ```json
  {
    "cedula": 22789456,
    "foto_b64": "data:image/jpeg;base64,...",
    "huella_b64": "Rk1SAA...",
    "metodo": "facial"
  }
  ```
- **Respuesta Empleado Reconocido (200 OK):**
  ```json
  {
    "es_empleado": true,
    "mensaje": "¡Bienvenido/a, Juan Carlos Pérez Gómez! Entrada registrada satisfactoriamente.",
    "nombre_completo": "Juan Carlos Pérez Gómez",
    "departamento": "Gerencia de Estadística",
    "tipo_evento": "entrada",
    "foto_detectada_b64": "/9j/4AAQSkZJRg...",
    "minutos_acumulados": 240
  }
  ```
- **Respuesta Visitante / No Registrado (200 OK):**
  ```json
  {
    "es_empleado": false,
    "mensaje": "Identidad no registrada o colaborador inactivo. Por favor acuda a recepción para registro de visitante.",
    "tipo_evento": "visitante"
  }
  ```

---

## 3. Autenticacion Administrativa

### 3.1 Inicio de Sesion
Valida credenciales administrativas con salt criptografico y comparacion en tiempo constante.
- **Ruta:** `POST /api/auth/login`
- **Cuerpo de Peticion:**
  ```json
  {
    "identifier": "admin",
    "password": "Admin2026!*"
  }
  ```
- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "token": "rapture_sec_31a977ebc6997aa85ed70421102d93eb7949dd93839a0192eba51e1a340e1f49",
    "usuario": {
      "id": 1,
      "username": "admin",
      "email": "admin@rapture.corp",
      "nombre_completo": "Administrador Principal de Seguridad",
      "rol_id": 1,
      "rol_codigo": "SUPER_ADMIN",
      "rol_nombre": "Super Administrador",
      "sede_id": null,
      "sede_nombre": "Todas las Sedes (Global)"
    },
    "politicas": [
      {
        "id": 1,
        "rol_id": 1,
        "modelo_codigo": "sedes",
        "puede_crear": true,
        "puede_leer": true,
        "puede_actualizar": true,
        "puede_eliminar": true,
        "puede_exportar": true,
        "alcance": "global"
      }
    ]
  }
  ```
- **Respuesta Error de Credenciales (401 Unauthorized):**
  ```json
  { "error": "Credenciales de acceso inválidas" }
  ```
- **Respuesta Cuenta Bloqueada (401 Unauthorized):**
  ```json
  { "error": "Cuenta bloqueada temporalmente por exceso de intentos fallidos. Intente de nuevo en 15 minutos." }
  ```

### 3.2 Cierre de Sesion
Revoca y destruye el token en el servidor de sesiones.
- **Ruta:** `POST /api/auth/logout`
- **Cabecera:** `Authorization: Bearer <token>`
- **Respuesta Exitosa (200 OK):**
  ```json
  { "ok": true }
  ```

---

## 4. Modulo de Organizacion y RRHH

### 4.1 Metricas del Dashboard
- **Ruta:** `GET /api/admin/dashboard`
- **Cabecera:** `Authorization: Bearer <token>`
- **Respuesta (200 OK):**
  ```json
  {
    "total_empleados": 3,
    "empleados_activos": 3,
    "sedes_activas": 2,
    "asistencias_hoy": 3,
    "en_curso_hoy": 2,
    "puntualidad_pct": 95.8
  }
  ```

### 4.2 Sedes
- **`GET /api/admin/sedes`:** Lista todas las sedes fisicas.
- **`POST /api/admin/sedes`:** Registra una nueva sede.
  ```json
  {
    "codigo": "SEDE-SUR",
    "nombre": "Centro de Distribución Sur",
    "direccion": "Zona Industrial Sur, Galpón 4",
    "ciudad": "Maracay"
  }
  ```

### 4.3 Departamentos
- **`GET /api/admin/departamentos?sede_id=:id`:** Lista departamentos (con filtro opcional por sede).
- **`POST /api/admin/departamentos`:** Crea un nuevo departamento.
  ```json
  {
    "sede_id": 1,
    "codigo": "DEP-VENTAS",
    "nombre": "Comercializacion y Ventas"
  }
  ```

### 4.4 Cargos
- **`GET /api/admin/cargos?departamento_id=:id`:** Lista cargos laborales.
- **`POST /api/admin/cargos`:** Crea un nuevo cargo.
  ```json
  {
    "departamento_id": 1,
    "nombre": "Analista de Inteligencia de Negocios",
    "descripcion": "Reportes y visualizacion de datos"
  }
  ```

### 4.5 Turnos y Reglas Horarias
- **`GET /api/admin/turnos`:** Lista los turnos disponibles.
- **`POST /api/admin/turnos`:** Registra un nuevo turno.
  ```json
  {
    "nombre": "Turno Nocturno de Seguridad",
    "hora_entrada": "22:00:00",
    "hora_salida": "06:00:00",
    "tolerancia_minutos": 10,
    "dias_laborales": "L,M,X,J,V,S"
  }
  ```

### 4.6 Colaboradores (Directorio y Enrolamiento)
- **`GET /api/admin/empleados?sede_id=:s&departamento_id=:d`:** Consulta de personal.
- **`POST /api/admin/empleados`:** Alta de colaborador con enrolamiento biometrico.
  ```json
  {
    "cedula": 28444555,
    "nombre_completo": "Ana Patricia Gomez",
    "email": "agomez@rapture.corp",
    "telefono": "+58 412 9998877",
    "sede_id": 1,
    "departamento_id": 2,
    "cargo_id": 2,
    "turno_id": 1,
    "template_huella": "FMR_DATA..."
  }
  ```
- **`PATCH /api/admin/empleados/:cedula/estado`:** Activa o desactiva un colaborador.
  ```json
  { "activo": false }
  ```

### 4.7 Auditoria de Asistencias
- **`GET /api/admin/asistencias`:** Lista el registro diario con retardo, minutos trabajados y estado.

---

## 5. Modulo de Seguridad y Matriz de Modelos

### 5.1 Roles Administrativos
- **`GET /api/admin/seguridad/roles`:** Obtiene todos los roles configurados.
- **`POST /api/admin/seguridad/roles`:** Crea un nuevo rol administrativo.

### 5.2 Modelos de Recursos
- **`GET /api/admin/seguridad/modelos`:** Retorna la definicion de los 7 modelos de recursos, iconos y soporte de alcance por sede.

### 5.3 Politicas por Rol y Modelo
- **`GET /api/admin/seguridad/roles/:id/politicas`:** Obtiene la matriz de permisos del rol.
- **`PUT /api/admin/seguridad/roles/:id/politicas`:** Actualiza la matriz completa de permisos del rol (`crear`, `leer`, `actualizar`, `eliminar`, `exportar`, `alcance`).

### 5.4 Usuarios Administrativos
- **`GET /api/admin/seguridad/usuarios`:** Lista los operadores administrativos.
- **`POST /api/admin/seguridad/usuarios`:** Registra un nuevo usuario aplicando validacion de contrasena minima de 8 caracteres y unicidad.
- **`PATCH /api/admin/seguridad/usuarios/:id/estado`:** Activa/desactiva la cuenta.
- **`POST /api/admin/seguridad/usuarios/:id/desbloquear`:** Restablece inmediatamente los fallos de fuerza bruta de una cuenta bloqueada.

### 5.5 Bitacora de Auditoria Forense
- **`GET /api/admin/seguridad/auditoria`:** Lista historica inmutable de eventos de seguridad (inicios de sesion, cambios de politicas, creacion de usuarios).
