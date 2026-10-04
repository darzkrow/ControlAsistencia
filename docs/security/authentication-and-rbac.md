# Especificacion de Seguridad, Autenticacion y RBAC por Modelos

Este documento detalla los estandares de ciberseguridad, mecanismos criptograficos, politicas de bloqueo y el modelo de control de acceso basado en roles con granularidad por modelo (**Model-Based RBAC**) implementados en **Rapture Biometrics PRO 2.0**.

---

## 1. Arquitectura de Autenticacion y Hashing

### 1.1 Esquema de Hasheado con Salt Criptografico
El sistema no almacena contrasenas en texto claro ni utiliza algoritmos vulnerables a colisiones. Se aplica el estandar de la publicacion FIPS PUB 180-4:

1. **Generacion de Salt:** Por cada usuario se genera un salt criptografico aleatorio unico de 16 bytes (32 caracteres hexadecimales) utilizando generadores de numeros pseudoaleatorios criptograficamente seguros (CSPRNG).
2. **Derivacion de Hash:** Se calcula el digest SHA-256 sobre la concatenacion `{salt}:{password}`.
3. **Formato de Almacenamiento:** El valor se almacena en `usuarios_admin.password_hash` bajo el formato:
   ```text
   {salt}${hash_hexadecimal_64_caracteres}
   ```
   Ejemplo:
   `rapture_admin_26$97fbb41ecb13b64fcf63eb7415b7cd5902f06cb99a26c021464c618ff120971b`

### 1.2 Mitigacion de Ataques de Canal Lateral por Tiempos (Timing Attacks)
Los operadores de comparacion convencionales (como `==` o `strcmp`) terminan la ejecucion en el primer byte que no coincide. Esto permite a un atacante inferir caracteres validos midiendo diferencias de nanosegundos en el tiempo de respuesta de la CPU.

- **Solucion Implementada:** Comparacion estricta en tiempo constante (`constant_time_eq` en Rust y `constantTimeCompare` / `crypto.timingSafeEqual` en Node.js):
  ```rust
  pub fn constant_time_eq(a: &str, b: &str) -> bool {
      if a.len() != b.len() {
          return false;
      }
      let mut diff = 0u8;
      for (x, y) in a.bytes().zip(b.bytes()) {
          diff |= x ^ y;
      }
      diff == 0
  }
  ```
  La operacion recorre siempre todos los bytes independientemente de cuando ocurra una discrepancia, garantizando que el tiempo de ejecucion sea invariable.

---

## 2. Politica de Proteccion contra Fuerza Bruta (Brute-Force Lockout)

Para neutralizar ataques de diccionario automatizados y ataques de relleno de credenciales (*Credential Stuffing*), el sistema aplica las siguientes reglas:

| Parametro | Valor | Comportamiento |
| :--- | :--- | :--- |
| **Limite de Fallos Consecutivos** | 5 intentos | Si el usuario ingresa 5 contrasenas incorrectas de forma consecutiva, la cuenta pasa a estado bloqueado. |
| **Tiempo de Bloqueo** | 15 minutos | Se fija la marca temporal `bloqueado_hasta = CURRENT_TIMESTAMP + 15 min`. |
| **Respuesta al Atacante** | HTTP 401 | Mensaje explicitando el tiempo restante: `"Cuenta bloqueada temporalmente por exceso de intentos fallidos. Intente de nuevo en X minutos."` |
| **Desbloqueo Automatico** | Transcurridos 15 min | Al expirar el tiempo, el sistema vuelve a permitir intentos. Si el siguiente intento es exitoso, `intentos_fallidos` se reinicia a 0. |
| **Desbloqueo Manual** | Inmediato | Un Super Administrador puede desbloquear manualmente una cuenta mediante `POST /api/admin/seguridad/usuarios/:id/desbloquear`. |

---

## 3. Gestion de Sesiones y Tokens Bearer

- **Generacion de Token:** Tras una autenticacion valida, se expide un token alfanumerico con 256 bits de entropia:
  `rapture_sec_{64_caracteres_hex}`.
- **Almacenamiento y TTL:** El token se almacena en memoria compartida vinculando `user_id`, `rol_id` y `expires_at`. La sesion tiene un tiempo de vida util maximo (TTL) de **8 horas**.
- **Autenticacion de Peticiones:** El cliente frontend incluye la cabecera:
  `Authorization: Bearer <token>`
- **Cierre de Sesion (Revocacion Inmediata):** El endpoint `POST /api/auth/logout` destruye el token en el servidor de forma instantanea, evitando la reutilizacion de tokens por terceros.

---

## 4. Matriz de Control de Acceso Basada en Modelos (Model-Based RBAC)

A diferencia de los sistemas tradicionales donde los permisos se verifican mediante cadenas de texto fijas, Rapture implementa una **Matriz de Politicas por Modelo de Recurso**.

### 4.1 Modelos de Recurso Registrados
1. `sedes`: Gestion de campus y sucursales fisicas.
2. `departamentos`: Unidades funcionales u oficinas.
3. `cargos`: Perfiles y puestos de trabajo.
4. `turnos`: Esquemas de horarios y tolerancias.
5. `empleados`: Directorio de colaboradores y enrolamiento biometrico.
6. `asistencias`: Auditoria de marcajes diarios y reportes de puntualidad.
7. `seguridad`: Administracion de usuarios, roles y politicas.

### 4.2 Acciones Disponibles por Modelo
Cada modelo define una lista de acciones autorizables:
- `crear`: Capacidad de registrar nuevas filas (HTTP POST).
- `leer`: Capacidad de consultar registros (HTTP GET).
- `actualizar`: Capacidad de modificar registros (HTTP PUT / PATCH).
- `eliminar`: Capacidad de dar de baja o borrar registros (HTTP DELETE).
- `exportar`: Capacidad de descargar reportes analiticos en CSV o PDF.

### 4.3 Dimension de Alcance Geografico (Scope)
Los modelos que soportan segmentacion fisica (`departamentos`, `empleados`, `asistencias`) incluyen un atributo de alcance:
- **`global`:** El usuario visualiza y administra registros de todas las sedes de la organizacion.
- **`sede`:** El usuario solo tiene visibilidad sobre los registros correspondientes a la sede a la que fue asignado (`usuario.sede_id`).
- **`ninguno`:** Acceso denegado a dicho modelo.

---

## 5. Auditoria de Seguridad Forense

Cada accion critica genera de forma obligatoria e inmutable un registro en la tabla `auditoria_seguridad`:
- Inicios de sesion exitosos y fallidos (con IP y agente de usuario).
- Bloqueos de cuentas por fuerza bruta.
- Creacion y desactivacion de usuarios administrativos.
- Modificaciones en la matriz de politicas de un rol.
- Enrolamiento de huellas y rostros de nuevos colaboradores.

Esta bitacora permite cumplir con estandares de no repudio y facilita auditorias de cumplimiento normativo (ISO 27001 / SOC 2).
