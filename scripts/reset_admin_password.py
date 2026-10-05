"""
Script de administración para el reseteo seguro de contraseñas.
Soporta actualización mediante API HTTP o generación de consulta SQL directa.
"""

import argparse
import hashlib
import json
import logging
import sys
import urllib.error
import urllib.request
import uuid
from typing import Dict, Any

# Configurar logger corporativo para la salida del CLI
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ResetAdminPassword")


def generate_password_hash(password: str) -> str:
    """
    Genera un hash con Salt aleatorio y SHA-256 en formato '{salt}${hash}'.
    Compatible con CryptoService::hash_password en backend/src/services/crypto.rs.
    """
    salt: str = uuid.uuid4().hex[:16]
    salted_data: bytes = f"{salt}:{password}".encode("utf-8")
    digest: str = hashlib.sha256(salted_data).hexdigest()
    return f"{salt}${digest}"


def reset_password_via_api(
    base_url: str,
    identifier: str,
    new_password: str,
) -> bool:
    """
    Envía solicitud HTTP POST al endpoint de reseteo de contraseña del backend.
    """
    endpoint_url: str = f"{base_url.rstrip('/')}/api/auth/reset-password"
    payload: Dict[str, Any] = {
        "identifier": identifier,
        "new_password": new_password,
    }
    data_bytes: bytes = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        endpoint_url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                response_body = response.read().decode("utf-8")
                res_data = json.loads(response_body)
                logger.info(
                    "Respuesta exitosa del backend API: %s",
                    res_data.get("mensaje", "Contraseña actualizada"),
                )
                return True
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8") if err.fp else ""
        logger.error(
            "El servidor API devolvió error HTTP %d: %s",
            err.code,
            err_body,
        )
    except urllib.error.URLError as err:
        logger.warning(
            "No se pudo conectar al servidor backend en %s (%s).",
            endpoint_url,
            err.reason,
        )

    return False


def generate_sql_statement(identifier: str, hashed_password: str) -> str:
    """
    Construye la sentencia SQL para actualización directa en PostgreSQL.
    """
    sql: str = (
        f"UPDATE public.usuarios_admin\n"
        f"SET password_hash = '{hashed_password}',\n"
        f"    intentos_fallidos = 0,\n"
        f"    bloqueado_hasta = NULL\n"
        f"WHERE username = '{identifier}' OR email = '{identifier}';"
    )
    return sql


def main() -> None:
    """
    Punto de entrada principal para la CLI de restablecimiento de contraseña.
    """
    parser = argparse.ArgumentParser(
        description="Restablecer contraseña del usuario administrador de Rapture Biometrics."
    )
    parser.add_argument(
        "--identifier",
        type=str,
        default="admin",
        help="Usuario o email del administrador (por defecto: admin)",
    )
    parser.add_argument(
        "--password",
        type=str,
        required=True,
        help="Nueva contraseña a establecer (mínimo 6 caracteres)",
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default="http://127.0.0.1:3000",
        help="URL base del servidor backend Axum (por defecto: http://127.0.0.1:3000)",
    )

    args = parser.parse_args()

    if len(args.password.strip()) < 6:
        logger.error("La contraseña debe tener al menos 6 caracteres.")
        sys.exit(1)

    logger.info("Iniciando restablecimiento de contraseña para '%s'...", args.identifier)

    # 1. Intentar actualizar mediante la API HTTP del backend
    success: bool = reset_password_via_api(
        base_url=args.api_url,
        identifier=args.identifier,
        new_password=args.password,
    )

    # 2. Generar el hash e imprimir la sentencia SQL como alternativa o respaldo
    hashed_password: str = generate_password_hash(args.password)
    sql_script: str = generate_sql_statement(args.identifier, hashed_password)

    if success:
        logger.info("Contraseña restablecida exitosamente mediante la API HTTP.")
    else:
        logger.info("Instrucción SQL generada para ejecución directa en PostgreSQL:")
        sys.stdout.write("\n" + sql_script + "\n\n")


if __name__ == "__main__":
    main()
