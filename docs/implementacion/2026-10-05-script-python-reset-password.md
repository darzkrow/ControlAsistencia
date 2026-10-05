# Script de Python para Reseteo de Contraseña del Usuario Admin

## Fecha
2026-10-05 14:10

## Objetivo
Proporcionar un script de línea de comandos en Python puro (sin dependencias de terceros) para generar hashes compatibles con el esquema de seguridad de Rapture (`{salt}${sha256}`) y restablecer la contraseña del usuario `admin` mediante API HTTP o SQL directo.

## Alcance
- Incluye:
  - Creación del archivo `scripts/reset_admin_password.py`.
  - Algoritmo de hashing compatible en tiempo real con `CryptoService::hash_password` de Rust Axum (`SHA-256` con `Salt` aleatorio).
  - Petición HTTP directa a `/api/auth/reset-password` utilizando la librería estándar `urllib.request`.
  - Impresión de la sentencia SQL para ejecución directa en PostgreSQL (`psql`).
- NO incluye:
  - Instalación de librerías externas no estándar de Python (ej: `requests`, `psycopg2`).

## Contexto
El sistema en Rust Axum utiliza el formato de contraseña `{salt}${hash_hex}` definido en `backend/src/services/crypto.rs:9-13`. Para restablecer la clave del usuario `admin`, se requiere generar un hash compatible e interactuar con el endpoint `/api/auth/reset-password` o ejecutar un `UPDATE` en la tabla `public.usuarios_admin`.

## Archivos afectados
| Archivo | Acción (crear/modificar/eliminar) | Motivo |
|---|---|---|
| `scripts/reset_admin_password.py` | Crear | Script autónomo de línea de comandos en Python para reseteo de contraseña admin |

## Diseño
El script solicitará el identificador del usuario (por defecto `admin`) y la nueva contraseña.
Generará un hash con `hashlib` y `uuid` en formato `{salt}${hash}`.
Enviará una solicitud HTTP `POST` a `http://127.0.0.1:3000/api/auth/reset-password`.
Si el servidor no está en ejecución, generará y mostrará la consulta SQL lista para ejecutarse en PostgreSQL.

## Contratos / Interfaces
```python
# Firma del método principal de hashing:
def generate_password_hash(password: str) -> str:
    """Genera hash con Salt aleatorio y SHA-256 compatible con CryptoService."""
```

## Dependencias
Ninguna dependencia externa (utiliza `hashlib`, `uuid`, `urllib.request`, `json`, `logging`, `sys`, `argparse` de la librería estándar de Python 3).

## Riesgos y mitigaciones
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Incompatibilidad de algoritmo de hashing | Baja | Alto | Réplica exacta de la concatenación `f"{salt}:{password}"` usada en `crypto.rs` |
| Servidor backend inactivo | Media | Bajo | Generación alternativa de la consulta SQL directa para `psql` / pgAdmin |

## Plan de verificación
- Tests a crear/correr: Ejecución sintáctica con `python -m py_compile scripts/reset_admin_password.py`.
- Linter: Verificación sintáctica con `python`.
- Criterio de "done": Ejecución sin errores sintácticos o de importación en Python 3.
