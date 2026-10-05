# Endpoints de Registro de Usuarios y Reseteo de Contraseña

## Fecha
2026-10-05 13:48

## Objetivo
Implementar los endpoints de backend Axum y funciones cliente API en frontend para el registro de nuevos usuarios y el reseteo/recuperación segura de contraseñas.

## Alcance
- Incluye:
  - Definición del repositorio en `backend/src/db/repositories/seguridad.rs` para verificar duplicados de usuario/email y actualizar la contraseña hasheada.
  - Creación de las estructuras de request/response para Registro (`RegisterPayload`) y Reseteo de Contraseña (`ResetPasswordPayload` y `AdminResetPasswordPayload`).
  - Implementación de los handlers en `backend/src/handlers/admin/seguridad.rs`: `register_handler`, `reset_password_handler`, `admin_reset_password_handler`.
  - Exposición de las rutas HTTP `/api/auth/register`, `/api/auth/reset-password` y `/api/admin/seguridad/usuarios/:id/reset-password` en `backend/src/main.rs`.
  - Actualización del cliente API en `frontend/src/services/api.ts` con funciones `registerUser`, `resetPassword` y `adminResetPassword`.
- NO incluye:
  - Envío real de correos electrónicos vía SMTP (se deja preparado el contrato HTTP).
  - Modificación del esquema de base de datos PostgreSQL (usa tablas existentes `usuarios_admin` y `auditoria_seguridad`).

## Contexto
Actualmente el sistema cuenta con el handler `create_usuario_handler` en `backend/src/handlers/admin/seguridad.rs:209` y el método `create_usuario` en `backend/src/db/repositories/seguridad.rs:311`, pero no existe una ruta `/api/auth/register` independiente ni endpoints dedicados a actualizar/resetear contraseñas (`reset-password`).

## Archivos afectados
| Archivo | Acción (crear/modificar/eliminar) | Motivo |
|---|---|---|
| `backend/src/db/repositories/seguridad.rs` | Modificar | Agregar funciones de actualización de contraseña y verificación de duplicados de usuario/email |
| `backend/src/handlers/admin/seguridad.rs` | Modificar | Implementar handlers `register_handler`, `reset_password_handler`, `admin_reset_password_handler` |
| `backend/src/main.rs` | Modificar | Registrar rutas `/api/auth/register`, `/api/auth/reset-password` y `/api/admin/seguridad/usuarios/:id/reset-password` |
| `frontend/src/services/api.ts` | Modificar | Exponer funciones TypeScript `registerUser`, `resetPassword` y `adminResetPassword` |

## Diseño
- **Registro (`/api/auth/register`)**: Valida que la contraseña tenga mínimo 6 caracteres, valida la existencia de username/email para evitar duplicaciones, aplica `CryptoService::hash_password` y asigna un rol por defecto (`2` - ADMIN_RRHH/Operador) si no se provee. Registra evento en `auditoria_seguridad`.
- **Reseteo de Contraseña (`/api/auth/reset-password`)**: Permite cambiar la clave especificando el identificador (usuario o correo). Si se suministra `current_password`, valida la autenticidad con `CryptoService::verify_password`. Limpia contadores de bloqueos e intentos fallidos.
- **Reseteo Administrativo (`/api/admin/seguridad/usuarios/:id/reset-password`)**: Permite a administradores forzar la contraseña de un usuario mediante su ID.

## Contratos / Interfaces
```json
// POST /api/auth/register
{
  "username": "usuario1",
  "email": "usuario1@empresa.com",
  "password": "Password123!",
  "nombre_completo": "Juan Pérez",
  "rol_id": 2,
  "sede_id": 1
}

// Response (201 Created):
{
  "id": 5,
  "ok": true,
  "mensaje": "Usuario registrado exitosamente."
}

// POST /api/auth/reset-password
{
  "identifier": "usuario1@empresa.com",
  "current_password": "PasswordOld123!", // Opcional
  "new_password": "PasswordNew123!"
}

// Response (200 OK):
{
  "ok": true,
  "mensaje": "Contraseña actualizada exitosamente."
}

// POST /api/admin/seguridad/usuarios/:id/reset-password
{
  "new_password": "PasswordNew123!"
}
```

## Dependencias
Ninguna nueva dependencia (usa `sqlx`, `serde`, `axum`, `CryptoService` ya existentes).

## Riesgos y mitigaciones
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Contraseñas débiles | Media | Alto | Validación en handler exigiendo longitud mínima de 6 caracteres |
| Fuerza bruta en cambio de contraseña | Media | Medio | Limpieza de contadores sólo ante cambio exitoso y auditoría de seguridad logueada |
| Duplicación de username/email | Baja | Medio | Comprobación previa en repositorio antes del `INSERT` |

## Plan de verificación
- Tests a crear/correr: `cargo check` y `cargo build` en el directorio `backend`.
- Linter: `cargo check` en backend.
- Criterio de "done": Compilación limpia del backend en Rust Axum y exportación completa del cliente TypeScript en `frontend/src/services/api.ts`.
