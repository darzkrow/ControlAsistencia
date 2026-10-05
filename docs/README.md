# Indice Central de Documentacion Tecnica - Rapture Biometrics PRO 2.0

Bienvenido al repositorio central de documentacion de ingenieria, arquitectura, seguridad y operacion del sistema **Rapture Biometrics PRO 2.0**.

Esta documentacion esta estructurada de forma modular para brindar soporte a desarrolladores, administradores de sistemas, especialistas de seguridad y operadores de recursos humanos.

---

## Estructura Modular de Documentacion

```text
docs/
├── README.md                              # Indice maestro y mapa de navegacion
├── architecture/
│   ├── system-overview.md                 # Arquitectura de alto nivel y flujo de datos
│   ├── tauri-desktop-setup.md             # Guia de empaquetado de escritorio y soporte USB
│   └── ip-biometric-terminals-integration.md # Integracion de terminales y captahuellas IP multi-marca
├── database/
│   ├── data-model.md                      # Modelo entidad-relacion y diccionario DDL
│   └── orm-and-connection-policies.md     # Gestion de conexiones SQLx y resiliencia
├── security/
│   ├── authentication-and-rbac.md         # Autenticacion, criptografia y politicas RBAC
│   └── biometric-policy.md                # Normativas de privacidad y manejo biometrico
├── api/
│   └── endpoints.md                       # Especificacion OpenAPI / Contratos REST
├── deployment/
│   └── docker-policies.md                 # Estandares de contenerizacion y seguridad Docker
└── guides/
    └── user-guide.md                      # Manual paso a paso para operadores y administradores
```

---

## 1. Arquitectura y Diseno de Software
- **[Vision General del Sistema](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/architecture/system-overview.md):** Describe los componentes principales (Kiosko Web, Portal de Administracion, Backend Asincrono en Rust, Worker Pool de OpenCV y persistencia relacional).
- **[Empaquetado de Escritorio Tauri y Lectores de Huella USB](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/architecture/tauri-desktop-setup.md):** Especificacion para distribucion en estaciones de trabajo fisicas de Windows/Linux y conexion con lectores opticos de huella.
- **[Integracion de Terminales y Captahuellas IP Multi-Marca](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/architecture/ip-biometric-terminals-integration.md):** Arquitectura y guia de configuracion para controles de acceso fisicos (ZKTeco, Hikvision, Dahua) con IP fija, modos Push/Pull y enrolamiento remoto.

## 2. Base de Datos y Persistencia
- **[Modelo de Datos Relacional y Diccionario](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/database/data-model.md):** Detalle de las 11 tablas del sistema: Sedes, Departamentos, Cargos, Turnos, Empleados, Roles, Modelos, Politicas RBAC, Usuarios Admin, Auditoria de Seguridad, Eventos del Lector y Jornada Diaria.
- **[Politicas de ORM y Pool de Conexiones](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/database/orm-and-connection-policies.md):** Parametrizacion del pool SQLx, tiempos de espera (*acquire timeout*), reciclaje de sockets y analisis comparativo con SeaORM.

## 3. Seguridad y Criptografia
- **[Autenticacion, Criptografia y Matriz de Modelos](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/security/authentication-and-rbac.md):** Detalle del algoritmo FIPS SHA-256 con salt criptografico, mitigacion de ataques de canal lateral (Timing Attacks), politicas de bloqueo por fuerza bruta (5 intentos = 15 min), sesiones Bearer de 256 bits y matriz dinamica de politicas por modelo con alcance territorial.
- **[Politicas de Seguridad y Manejo Biometrico](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/security/biometric-policy.md):** Cumplimiento con estandares RGPD, politicas de retencion de evidencias visuales (30-90 dias) y proteccion de datos sensibles.

## 4. Interfaces de Programacion (API)
- **[Especificacion de Endpoints REST](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/api/endpoints.md):** Catalogo completo de los 17 endpoints disponibles, cabeceras requeridas, esquemas JSON de peticion y respuesta, y codigos de estado HTTP.

## 5. Infraestructura y Despliegue
- **[Politicas de Contenerizacion y Docker](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/deployment/docker-policies.md):** Principio de ejecucion sin privilegios root, eliminacion de capacidades del kernel (`cap_drop`), construccion multi-etapa y sincronizacion con healthchecks.

## 6. Manuales de Usuario
- **[Manual de Operacion Paso a Paso](file:///d:/PerfilUsuario/Desktop/captador_huellas-master/docs/guides/user-guide.md):** Procedimientos operativos paso a paso para el registro de marcajes en el kiosko, acceso al portal administrativo, configuracion de sedes y departamentos, registro de colaboradores con enrolamiento biometrico, auditoria de asistencias y configuracion de la matriz de seguridad.
