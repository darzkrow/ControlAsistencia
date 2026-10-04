# Arquitectura General del Sistema - Rapture Biometrics PRO 2.0

Este documento describe la arquitectura modular, los patrones de diseno, los componentes de software y los flujos de datos que componen el sistema **Rapture Biometrics PRO 2.0**.

---

## 1. Diagrama de Arquitectura de Alto Nivel

```text
+----------------------------------------------------------------------------------------------------+
|                                    CAPA DE CLIENTE (FRONTEND)                                      |
|                                                                                                    |
|  +--------------------------------------------+    +--------------------------------------------+  |
|  |       Terminal Kiosko Biometrico           |    |       Portal de Administracion y RRHH      |  |
|  |  - HUD de Escaneo Facial en Tiempo Real    |    |  - Dashboard Metrico Operativo             |  |
|  |  - Sensor de Huella Dactilar Simulado / USB|    |  - Gestion Dinamica de Sedes y Deptos      |  |
|  |  - Teclado Tactil para Numero de Cedula    |    |  - Directorio de Personal y Enrolamiento   |  |
|  |  - Sintesis de Audio y Sonidos Operativos  |    |  - Auditoria de Asistencias y Retardos     |  |
|  |  - Indicador Interactivo de Conexion Axum  |    |  - Matriz de Politicas RBAC por Modelo     |  |
|  +--------------------------------------------+    +--------------------------------------------+  |
|                                         React 19 + TypeScript + Vite                               |
+-----------------------------------------------------+----------------------------------------------+
                                                      |
                                                      | HTTP / REST (Vite Reverse Proxy: /api)
                                                      | Bearer Token Authentication (Authorization)
                                                      v
+----------------------------------------------------------------------------------------------------+
|                                    CAPA DE SERVICIOS (BACKEND)                                     |
|                                                                                                    |
|  +-----------------------+   +-----------------------+   +---------------------------------------+ |
|  | Router HTTP (Axum)    |   | Middleware de Auth    |   | Criptografia y Seguridad              | |
|  | - /api/health         |   | - Token Extractor     |   | - FIPS SHA-256 + Salt Aleatorio       | |
|  | - /api/escaneo        |   | - Verificacion Sesion |   | - Comparacion en Tiempo Constante     | |
|  | - /api/auth/*         |   | - Control de Expiracion|  | - Bloqueo de Fuerza Bruta (5 intentos) | |
|  | - /api/admin/*        |   | - Evaluacion RBAC     |   | - Cache en Memoria con TTL de 8 horas | |
|  +-----------------------+   +-----------------------+   +---------------------------------------+ |
|                                                                                                    |
|  +-----------------------------------------------+   +-------------------------------------------+ |
|  | Servicio de Asistencia y Jornadas             |   | Motor Biometrico (OpenCV)                 | |
|  | - Resolucion de Cambio de Dia (Day Rollover)   |   | - Haar Cascade Facial Detection           | |
|  | - Calculo Acumulativo de Minutos Laborados    |   | - Aislamiento en Pool de Bloqueo Tokio    | |
|  | - Control Anti-Passback Temporal (15 seg)     |   | - Extraccion y Validacion de Huellas      | |
|  +-----------------------------------------------+   +-------------------------------------------+ |
+-----------------------------------------------------+----------------------------------------------+
                                                      |
                                                      | Pool Asincrono SQLx (PostgreSQL Driver)
                                                      | Transacciones ACID con Aislamiento Read Committed
                                                      v
+----------------------------------------------------------------------------------------------------+
|                                    CAPA DE DATOS (POSTGRESQL 16)                                   |
|                                                                                                    |
|  +-----------------------+   +-----------------------+   +---------------------------------------+ |
|  | Organizacion          |   | Talento Humano        |   | Seguridad y Control                   | |
|  | - sedes               |   | - empleados           |   | - roles                               | |
|  | - departamentos       |   | - turnos              |   | - modelos_recurso                     | |
|  | - cargos              |   | - eventos_lector      |   | - rol_politicas_modelo                | |
|  |                       |   | - jornada_diaria      |   | - usuarios_admin                      | |
|  |                       |   |                       |   | - auditoria_seguridad                 | |
|  +-----------------------+   +-----------------------+   +---------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Componentes del Sistema

### 2.1 Frontend (React 19 + TypeScript + Vite)
- **Modo Kiosko:** Disenado para pantallas tactiles y terminales fisicos de acceso. Proporciona una interfaz oscura de alto contraste con feedback visual inmediato (HUD de camara, deteccion de cuadrante facial, lector de huella dactilar, reloj digital sincronizado).
- **Modo Portal Administrativo:** Modulo protegido por contrasena y roles para administradores de recursos humanos y seguridad. Incluye navegacion por secciones:
  - Dashboard de metricas operativas en tiempo real.
  - Gestion organizativa (sedes, departamentos, cargos, turnos).
  - Enrolamiento y directorio de colaboradores.
  - Auditoria de marcajes y puntualidad.
  - Configuracion de roles, usuarios administrativos y matriz de permisos por modelo.
- **Cliente API Resiliente:** Administra las solicitudes HTTP mediante `/api`, aprovecha el proxy inverso de Vite y realiza sondeo dinamico del estado del backend cada 4 segundos o al enfocar la ventana.

### 2.2 Backend Asincrono (Rust Axum / Bridge Server)
- **Servidor Web:** Construido sobre Axum 0.7 y Tokio. Ofrece manejo no bloqueante de miles de conexiones concurrentes con bajo consumo de memoria RAM.
- **Worker Pool OpenCV:** El procesamiento intensivo de imagenes (conversion a escala de grises, ecualizacion de histograma y deteccion Haar Cascade) se ejecuta mediante `tokio::task::spawn_blocking`, asegurando que la CPU intensiva no congele el hilo asincrono que atiende solicitudes de red.
- **Servicio Criptografico:** Implementa hash SHA-256 estandar con salting aleatorio de 128 bits, proteccion contra ataques de canal lateral mediante comparacion en tiempo constante, bloqueo por fuerza bruta y emision de tokens criptograficos con expiracion automatica a las 8 horas.

### 2.3 Base de Datos (PostgreSQL 16)
- **Gobernanza Relacional:** 11 tablas interconectadas con claves foraneas e integridad referencial (`ON DELETE RESTRICT` y `ON DELETE CASCADE` segun corresponda).
- **Pool de Conexiones SQLx:** Ajustado con conexiones minimas precalentadas (Warm Pool), limite maximo de conexiones para prevenir agotamiento de descriptores de socket y verificacion de liveness antes de entrega.

---

## 3. Flujo de Datos: Proceso de Marcaje Biometrico

```text
1. Usuario presenta cedula y/o rostro/huella en el Kiosko.
2. Frontend captura el fotograma en Base64 y/o el template biometrico.
3. Kiosko despacha peticion HTTP POST a /api/escaneo.
4. Backend verifica si existe un cooldown activo (anti-passback).
5. Si no esta en cooldown:
   a. Verifica si el colaborador existe y esta activo en PostgreSQL.
   b. Ejecuta deteccion facial en el pool de bloqueo de Tokio.
   c. AttendanceService determina si corresponde ENTRADA o SALIDA evaluando la fecha actual.
   d. Abre transaccion SQLx:
      - Inserta registro inmutable en eventos_lector.
      - Inserta o actualiza fila correspondiente en jornada_diaria.
   e. Confirma transaccion (COMMIT).
6. Backend devuelve respuesta JSON con datos de la persona y acumulado del dia.
7. Frontend muestra ResultCard visual con confirmacion y emite tono de audio de exito.
```

---

## 4. Flujo de Datos: Autenticacion Administrativa y Verificacion de Politicas

```text
1. Administrador introduce identificador (usuario/correo) y contrasena en /api/auth/login.
2. Backend localiza el usuario en usuarios_admin.
3. Verifica si la cuenta esta activa y si no supera los 5 intentos fallidos (bloqueo de 15 min).
4. Aplica SHA-256 con el salt almacenado y realiza comparacion en tiempo constante.
5. En caso de exito:
   a. Restablece contador de fallos a 0.
   b. Genera token de 256 bits y crea sesion en memoria con TTL de 8 horas.
   c. Carga la matriz de politicas del rol desde rol_politicas_modelo.
   d. Registra evento LOGIN_EXITOSO en auditoria_seguridad.
   e. Retorna token, datos de usuario y matriz de modelos.
6. Peticiones subsiguientes adjuntan cabecera Authorization: Bearer <token>.
7. Middleware valida el token contra la sesion activa y comprueba permisos segun la accion solicitada (crear, leer, actualizar, eliminar, exportar).
```
