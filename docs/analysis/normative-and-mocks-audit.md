# Analisis Normativo y Plan de Erradicacion de Valores Hardcodeados y Mocks

**Fecha de Auditoria:** 04 de Octubre de 2026  
**Sistema Auditado:** Rapture Biometrics PRO 2.0  
**Objetivo:** Cumplimiento con marcos regulatorios internacionales (Laboral, Proteccion de Datos Biometricos, Ciberseguridad) y eliminacion definitiva de logicas simuladas (mocks) y datos quemados en codigo.

---

## 1. Analisis de Cumplimiento Normativo

### 1.1 Normativa Laboral y Registro Horario (OIT, Estatuto de los Trabajadores, Legislacion Nacional)
- **Principio de Inmutabilidad y No Repudio:**
  - *Exigencia Legal:* La ley exige que los registros de entrada y salida sean fehacientes, inmutables y trazables. Esta expresamente prohibido alterar o simular marcaciones.
  - *Deficiencia Encontrada en el Codigo:* En `frontend/src/App.tsx`, cuando el backend no respondia, el bloque `catch` simulaba una marcacion positiva exitosa para cedulas de prueba (`Juan Carlos Perez Gomez - Entrada registrada`).
  - *Riesgo:* En una inspeccion de trabajo o disputa judicial, un registro simulado sin persistencia en el backend ni sello temporal del servidor acarrea sanciones severas y nulidad probatoria.
  - *Medida Requerida:* Eliminar cualquier respuesta simulada. Si la red falla o el servidor no responde, el sistema debe indicar con total transparencia: `"Error de comunicacion con el servidor. No se pudo registrar la asistencia."`

### 1.2 Normativa de Proteccion de Datos Personales y Biometria (RGPD Art. 9, LGPD, ISO/IEC 19794-2)
- **Principio de Privacidad por Diseno y Confidencialidad:**
  - *Exigencia Legal:* Los datos biometricos (rostros y huellas) son datos de categoria especial. El tratamiento de la cedula de identidad debe prevenir la suplantacion (*Buddy Punching*).
  - *Deficiencia Encontrada en el Codigo:* En `frontend/src/components/CkpInput.tsx`, la interfaz muestra botones de acceso rapido con las cedulas de empleados reales (`22789456`, `19543210`, `25111222`). Cualquier transeunte que se acerque a un kiosko desatendido en recepcion puede pulsar esos botones y marcar asistencia a nombre de otro trabajador.
  - *Medida Requerida:* Eliminar los botones de cedulas fijas. El teclado debe funcionar unicamente como teclado de entrada manual o mediante lectura directa de sensores fisicos.

### 1.3 Normativa de Seguridad de la Informacion (ISO/IEC 27001, SOC 2, OWASP Top 10)
- **OWASP A07: Identification and Authentication Failures:**
  - *Deficiencia Encontrada en el Codigo:* En `frontend/src/components/admin/AdminLogin.tsx`, existen botones que inyectan credenciales de SuperAdmin (`admin`, `Admin2026!*`) con un solo clic.
  - *Riesgo:* Violacion flagrante de control de accesos. Un usuario no autorizado en la red interna puede ingresar al panel de recursos humanos y ver datos salariales, direcciones y fotografias sin autenticarse realmente.
  - *Medida Requerida:* Eliminar los botones de acceso directo. Todo inicio de sesion debe ser ingresado manualmente y validado contra el hash criptografico individual en base de datos.
- **OWASP A01: Broken Access Control & Data Integrity:**
  - *Deficiencia Encontrada en el Codigo:* En `frontend/src/services/api.ts`, hay mas de 800 lineas de arrays locales (`mockSedes`, `mockDeptos`, `mockEmpleados`, `mockRoles`, etc.). Cuando la API falla, el frontend simula el exito modificando variables en memoria del navegador.
  - *Riesgo:* El usuario cree haber registrado una sede, departamento o empleado, pero al refrescar la pagina los datos se pierden, pues jamas se guardaron en la base de datos PostgreSQL.
  - *Medida Requerida:* Eliminar todas las variables mock en el cliente. La aplicacion debe depender al 100% de las respuestas de la base de datos real y propagar los errores de forma veraz.

---

## 2. Inventario Exhaustivo de Valores Hardcodeados y Mocks Detectados

| Ubicacion | Tipo de Mock / Hardcode | Descripcion del Problema | Accion Correctiva |
| :--- | :--- | :--- | :--- |
| **`frontend/src/App.tsx`** (Lineas 110-140) | Simulación de Marcaje en `catch` | Genera respuestas falsas de entrada/salida para 3 cédulas de demostración cuando el backend no contesta. | **Eliminar.** Reemplazar por manejo de error legítimo que avise al usuario del fallo del servidor. |
| **`frontend/src/components/CkpInput.tsx`** (Lineas 190-230) | Cédulas Quemadas en UI | Botones con cédulas hardcodeadas en pantalla (`22789456`, etc.). | **Eliminar.** Dejar el teclado numérico estándar sin accesos directos de identidad. |
| **`frontend/src/components/admin/AdminLogin.tsx`** (Lineas 240-315) | Credenciales Quemadas en UI | Botones con contraseñas fijas que rellenan el formulario y acceden como SuperAdmin. | **Eliminar.** Exigir ingreso manual de credenciales por el operador. |
| **`frontend/src/services/api.ts`** (Lineas 345-1220) | 800+ Líneas de Mocks Locales | Arrays `mockSedes`, `mockDeptos`, `mockCargos`, `mockTurnos`, `mockEmpleados`, `mockRoles`, `mockModelos`, `mockPoliticas`, `mockUsuarios`, `mockAuditoria` con CRUDs falsos. | **Eliminar.** Refactorizar las funciones para interactuar 100% con la API REST real. |
| **`backend/server_bridge.js`** (Lineas 7-150) | Arrays en Memoria en el Backend | El servidor almacena los datos en memoria en lugar de ejecutar queries contra el contenedor PostgreSQL `rapture-db`. | **Conectar a PostgreSQL.** Usar el driver `pg` para ejecutar sentencias SQL transaccionales en la base de datos `api_db`. |

---

## 3. Plan de Accion y Refactorizacion Inmediata

```text
Paso 1: Conectar backend/server_bridge.js a la base de datos PostgreSQL (puerto 5432).
        -> Reemplazar lectura/escritura de arrays en memoria por SELECT, INSERT, UPDATE en PostgreSQL.
        -> Utilizar transacciones ACID para eventos_lector y jornada_diaria.

Paso 2: Depurar frontend/src/services/api.ts.
        -> Eliminar todas las definiciones de datos mock locales.
        -> Hacer que cada llamada retorne los datos de PostgreSQL o lance el error HTTP correspondiente.

Paso 3: Eliminar la simulacion de marcaje en frontend/src/App.tsx.
        -> Notificar formalmente al colaborador cuando el servidor no se encuentre disponible.

Paso 4: Limpiar la interfaz de usuario en CkpInput.tsx y AdminLogin.tsx.
        -> Remover botones de cédulas quemadas y credenciales de acceso directo.

Paso 5: Pruebas de persistencia real en PostgreSQL y compilación sin errores.
```
