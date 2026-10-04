# Rapture - Sistema de Control de Asistencia y Acceso Biometrico

Sistema corporativo de registro de jornada laboral, control de acceso biometrico multimodal y gestion organizativa integral. El sistema esta compuesto por un **Kiosko Interactivo y Portal Administrativo en React 19 + TypeScript + Vite** y un **Backend Asincrono de Alto Rendimiento en Rust (Axum 0.7 + Tokio + SQLx + OpenCV)** respaldado por **PostgreSQL 16**.

---

## Tabla de Contenidos
- [Vision General](#vision-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Mejoras Estructurales y Logicas Implementadas](#mejoras-estructurales-y-logicas-implementadas)
- [Requisitos Previos](#requisitos-previos)
- [Estructura Modular del Proyecto](#estructura-modular-del-proyecto)
- [Configuracion y Puesta en Marcha](#configuracion-y-puesta-en-marcha)
- [Estructura de Documentacion Tecnica](#estructura-de-documentacion-tecnica)
- [Seguridad y Proteccion de Datos](#seguridad-y-proteccion-de-datos)

---

## Vision General

El sistema Rapture proporciona una solucion integral para la captura de asistencia y administracion de talento humano:

1. **Identificacion Multimodal:** Soporte para verificacion mediante numero de documento (cedula), captura facial en vivo a traves de camara web y captura dactilar optica (ISO/IEC 19794-2).
2. **Kiosko Biometrico en Tiempo Real:** Interfaz tactil reactiva con visor HUD, deteccion de rostros, feedback sonoro interactivo (Web Audio API) y proteccion anti-passback.
3. **Portal de Administracion y RRHH:** Panel administrativo completo para gestion organizativa dinamica: sedes fisicas, departamentos, cargos, turnos con reglas de tolerancia y directorio de colaboradores con enrolamiento biometrico.
4. **Seguridad y Gestion por Modelos (RBAC):** Autenticacion robusta con contrasenas hasheadas con salt criptografico, proteccion contra ataques de temporizacion, bloqueo automatico tras 5 intentos fallidos y matriz de permisos por modelo con alcance geografico (global o por sede).
5. **Persistencia ACID y Auditoria Inmutable:** Base de datos relacional PostgreSQL con registro historico de cada marcaje, calculo automatico de minutos laborados y bitacora de auditoria de eventos de seguridad.

---

## Arquitectura del Sistema

```text
+---------------------------------------+           HTTP / REST (Proxy Vite)     +---------------------------------------+
|    Frontend (React 19 + TypeScript)   | -------------------------------------> |      Servidor Backend (Axum / Bridge) |
|  - Kiosko Biometrico HUD              |                                        |  - Runtime Asincrono Tokio            |
|  - Portal Administrativo y RRHH       |                                        |  - Worker Pool OpenCV (spawn_blocking)|
|  - Matriz de Seguridad y Modelos      | <------------------------------------- |  - Gestor de Sesiones y Criptografia  |
|  - Sintesis de Audio Web API          |      Respuestas JSON + Tokens Bearer   +-------------------+-------------------+
+---------------------------------------+                                                            |
                                                                                    Pool de SQLx     | Persistencia ACID
                                                                                                     v
                                                                                 +------------------------------------+
                                                                                 |        PostgreSQL (api_db)         |
                                                                                 |  - sedes, departamentos, cargos    |
                                                                                 |  - turnos, empleados, biometria    |
                                                                                 |  - roles, modelos, politicas RBAC  |
                                                                                 |  - usuarios_admin, auditoria       |
                                                                                 |  - jornada_diaria, eventos_lector  |
                                                                                 +------------------------------------+
```

---

## Mejoras Estructurales y Logicas Implementadas

1. **Correccion del Error de Cambio de Dia (Day Rollover):**
   - Se resolvio el problema donde la ausencia de marcaje de salida el dia previo causaba un calculo erroneo de mas de 24 horas continuas al dia siguiente. Si la fecha actual carece de marcajes, el primer registro se procesa estrictamente como ENTRADA.
2. **Capa Organizativa Dinamica y No Hardcodeada:**
   - Se crearon entidades gestionables para sedes fisicas, departamentos asociados, cargos y turnos laborales con limites de tolerancia y dias activos, eliminando valores fijos en el codigo fuente.
3. **Mecanismo Anti-Passback Temporal:**
   - Periodo de enfriamiento configurable (cooldown de 10-15 segundos) que previene marcaciones accidentales consecutivas por rebote o pulsacion repetida.
4. **Aislamiento de Carga de CPU en Tokio:**
   - Las operaciones de vision artificial con OpenCV se delegan a un pool dedicado de hilos bloqueantes (`tokio::task::spawn_blocking`), evitando la degradacion del hilo principal asincrono.
5. **Seguridad Criptografica de Autenticacion:**
   - Se eliminaron todos los accesos backdoor y comparaciones estaticas.
   - Algoritmo de hash SHA-256 canonico con salt aleatorio de 128 bits por usuario.
   - Comparacion en tiempo constante para mitigar ataques de canal lateral (Timing Attacks).
   - Politica de bloqueo por fuerza bruta: 5 intentos fallidos bloquean la cuenta durante 15 minutos.
6. **Matriz de Politicas por Modelo de Recurso:**
   - Control de acceso basado en roles con configuracion granular por modelo (`sedes`, `departamentos`, `cargos`, `turnos`, `empleados`, `asistencias`, `seguridad`) y alcance territorial (`global` frente a `sede`).
7. **Limpieza del Proyecto:**
   - Se elimino el prototipo obsoleto `frontend-leptos` y se consolido el proyecto exclusivamente bajo la arquitectura moderna React + TypeScript + Vite.

---

## Requisitos Previos

- **Node.js 18+** y **npm** (para el Frontend Kiosko y Portal Administrativo).
- **PostgreSQL 14+** o contenedor Docker activo.
- **Docker** y **Docker Compose** (recomendado para despliegue contenerizado).
- **Rust 1.80+** y `cargo` (opcional, para desarrollo nativo del backend Axum).
- **OpenCV 4.x** (para compilacion nativa C++ con bindings de Rust).

---

## Estructura Modular del Proyecto

```text
captador_huellas-master/
├── Cargo.toml                       # Configuracion de workspace Cargo
├── .env.ejemplo                     # Plantilla de variables de entorno
├── respaldo_rapture.sql             # Esquema DDL consolidado con datos semilla
├── docker-compose.yml               # Orquestacion de contenedores (PostgreSQL y Backend)
├── docs/                            # Documentacion tecnica detallada
│   ├── README.md                    # Mapa central de navegacion documental
│   ├── architecture/
│   │   ├── system-overview.md       # Diagramas y arquitectura del sistema
│   │   └── tauri-desktop-setup.md   # Empaquetado de escritorio y soporte USB
│   ├── database/
│   │   ├── data-model.md            # Esquema relacional y diccionario de datos
│   │   └── orm-and-connection-policies.md # Politicas de pool SQLx y SeaORM
│   ├── security/
│   │   ├── authentication-and-rbac.md  # Autenticacion, criptografia y modelos
│   │   └── biometric-policy.md      # Cumplimiento RGPD y gestion biometrica
│   ├── api/
│   │   └── endpoints.md             # Especificacion de contratos REST
│   ├── deployment/
│   │   └── docker-policies.md       # Seguridad y gobernanza en contenedores
│   └── guides/
│       └── user-guide.md            # Manual de operacion paso a paso
├── backend/                         # Backend en Rust / Servidor de Enlace
│   ├── Cargo.toml                   # Dependencias Rust (Axum, SQLx, OpenCV)
│   ├── Dockerfile                   # Construccion multi-etapa segura
│   ├── server_bridge.js             # Servidor de enlace de alta disponibilidad
│   └── src/                         # Codigo fuente modular en Rust
│       ├── main.rs                  # Punto de entrada y configuracion de rutas
│       ├── config.rs                # Carga de variables de entorno
│       ├── state.rs                 # Estado compartido y cache de sesiones
│       ├── db/                      # Pool de conexiones y repositorios
│       ├── handlers/                # Controladores HTTP y middleware
│       ├── models/                  # DTOs y entidades de dominio
│       └── services/                # Logica de negocio, biometria y criptografia
└── frontend/                        # Aplicacion Web React 19 + TypeScript
    ├── package.json                 # Dependencias (React, Lucide, Vite)
    ├── vite.config.ts               # Bundler y configuracion de proxy reverso
    ├── index.html                   # Plantilla HTML5 con fuentes tipograficas
    └── src/
        ├── App.tsx                  # Enrutador principal de la aplicacion
        ├── context/                 # Contexto de autenticacion y politicas
        ├── components/              # Componentes de interfaz (Kiosko y Admin)
        │   ├── BiometricHUD.tsx     # Visor de camara en vivo y lector de huellas
        │   ├── Header.tsx           # Barra superior con estado interactivo
        │   ├── CkpInput.tsx         # Teclado numerico para marcaje por cedula
        │   ├── ResultCard.tsx       # Tarjeta de resultado con temporizador
        │   └── admin/               # Modulos del Portal Administrativo
        │       ├── AdminPortal.tsx  # Contenedor del portal administrativo
        │       ├── AdminLogin.tsx   # Pasarela de inicio de sesion seguro
        │       ├── AdminDashboard.tsx # Metricas operativas y graficos
        │       ├── OrganizacionManager.tsx # Gestion de sedes, deptos y cargos
        │       ├── EmpleadosManager.tsx    # Directorio de personal y enrolamiento
        │       ├── AsistenciasAuditoria.tsx # Auditoria de jornadas laborales
        │       └── SeguridadManager.tsx    # Usuarios admin, roles y politicas
        └── services/
            ├── api.ts               # Cliente HTTP con fallback resiliente
            └── audio.ts             # Sintetizador sonoro con Web Audio API
```

---

## Configuracion y Puesta en Marcha

### 1. Variables de Entorno
Copia la plantilla `.env.ejemplo` a `.env`:
```bash
cp .env.ejemplo .env
```

Parametros de configuracion en `.env`:
```env
DATABASE_URL=postgres://admin:secreto@localhost:5432/api_db
SERVER_HOST=127.0.0.1
SERVER_PORT=3000
COOLDOWN_SECONDS=15
MAX_BODY_LIMIT_MB=15
```

### 2. Base de Datos PostgreSQL
Inicia el contenedor de base de datos o utiliza un servidor local:
```bash
docker compose up -d db
```
El archivo `respaldo_rapture.sql` inicializa las tablas, relaciones, roles predeterminados y usuarios administrativos de prueba.

### 3. Puesta en Marcha del Backend (Puerto 3000)
Para iniciar el servicio backend:
```bash
node backend/server_bridge.js
```
El servicio estara disponible en `http://127.0.0.1:3000` con healthcheck activo en `/api/health`.

### 4. Puesta en Marcha del Frontend (Puerto 5173)
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
El terminal Kiosko y Portal Administrativo estaran disponibles en `http://localhost:5173/`.

---

## Estructura de Documentacion Tecnica

Toda la documentacion de ingenieria y manuales de operacion se encuentran organizados de forma estructurada en el directorio `docs/`:

1. **[Indice Central de Documentacion](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/README.md):** Mapa general de navegacion y arquitectura de la documentacion.
2. **[Arquitectura del Sistema](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/architecture/system-overview.md):** Especificacion arquitectonica, patrones de diseno y flujo de datos.
3. **[Soporte de Escritorio Tauri y Lectores USB](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/architecture/tauri-desktop-setup.md):** Instrucciones para empaquetado nativo `.exe` y lectura de huellas dactilares.
4. **[Modelo de Datos y Base de Datos](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/database/data-model.md):** Diagrama relacional, diccionario de datos y constraints.
5. **[Politicas de ORM y Pool de Conexiones](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/database/orm-and-connection-policies.md):** Gestion de conexiones SQLx, timeouts y resiliencia.
6. **[Seguridad, Autenticacion y RBAC](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/security/authentication-and-rbac.md):** Mecanismos criptograficos, proteccion contra ataques de canal lateral y gestion de politicas por modelo.
7. **[Politica de Privacidad y Manejo Biometrico](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/security/biometric-policy.md):** Cumplimiento normativo, almacenamiento de evidencias y cifrado en reposo.
8. **[Especificacion de la API REST](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/api/endpoints.md):** Contrato completo de todos los endpoints, esquemas JSON y codigos de estado.
9. **[Politicas de Contenerizacion Docker](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/deployment/docker-policies.md):** Estandares de despliegue en contenedores, gobernanza de recursos y aislamiento.
10. **[Manual de Operacion Paso a Paso](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/guides/user-guide.md):** Guia paso a paso para operadores del kiosko y administradores de talento humano y seguridad.

---

## Seguridad y Proteccion de Datos

- **Principio de Privacidad por Diseno:** Las capturas y patrones biometricos se tratan como informacion confidencial y sensible. Se recomienda limitar el tiempo de retencion de evidencias visuales a un maximo de 30-90 dias.
- **Proteccion contra Denegacion de Servicio (DoS):** Carga util limitada a 15 MB para transmision controlada de capturas de alta definicion sin riesgo de agotamiento de memoria.
- **Canal Seguro en Produccion:** Todo despliegue en ambiente productivo debe realizarse bajo HTTPS/TLS 1.3 con certificados validos y restriccion de cabeceras CORS a los dominios autorizados de la empresa.
