# Políticas de Contenerización y Despliegue en Docker

Este documento detalla los estándares, políticas de seguridad y optimizaciones de infraestructura aplicadas para la ejecución del backend en contenedores Docker / Podman.

---

## 1. Políticas de Seguridad Aplicadas

### 1.1 Principio de Mínimo Privilegio (Non-Root User)
- **Riesgo:** Ejecutar contenedores como `root` permite que cualquier vulnerabilidad de escape de contenedor comprometa el sistema anfitrión.
- **Implementación:**
  - Se crea un grupo y usuario de sistema dedicado:
    ```dockerfile
    RUN groupadd -g 10001 rapture && \
        useradd -u 10001 -g rapture -s /bin/sh -M -d /app rapture
    USER rapture:rapture
    ```
  - El proceso de Axum se ejecuta con UID/GID `10001:10001`.

### 1.2 Prevención de Escalada de Privilegios
- **Configuración en `docker-compose.yml`:**
  ```yaml
  security_opt:
    - "no-new-privileges:true"
  cap_drop:
    - ALL
  ```
  - `no-new-privileges`: Impide que binarios dentro del contenedor obtengan privilegios adicionales mediante `setuid`/`setgid`.
  - `cap_drop: [ ALL ]`: Elimina todas las capacidades (*Linux capabilities*) del kernel no necesarias para servir tráfico web.

### 1.3 Red Aislada (Bridge Network)
- Los contenedores se comunican a través de una red virtual privada interna (`rapture-network`).
- La base de datos PostgreSQL no necesita exponer puertos a redes públicas; solo el puerto 3000 de la API y el puerto 5432 para administración local están mapeados.

### 1.4 Rotación de Registros (Log Rotation)
- **Riesgo:** Logs descontrolados pueden colapsar el almacenamiento del disco en producción.
- **Implementación:**
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```
  - Cada contenedor retiene un máximo de 3 archivos de 10 MB (máximo 30 MB por servicio).

---

## 2. Políticas de Rendimiento y Optimización

### 2.1 Construcción Multi-Etapa (Multi-Stage Build)
- **Etapa 1 (Builder):**
  - Utiliza `rust:1.85-bookworm` con herramientas de compilación (`clang`, `libopencv-dev`, `cmake`).
  - **Aprovechamiento de Caché:** Se copian primero únicamente `Cargo.toml` y `Cargo.lock` con un `src/main.rs` provisional para precompilar y cachear las más de 200 dependencias externas. Esto reduce los tiempos de reconstrucción de minutos a segundos.
  - **Reducción de Binario:** Ejecuta `strip` para eliminar símbolos de depuración del binario final.
- **Etapa 2 (Runner):**
  - Imagen final basada en `debian:bookworm-slim`, conteniendo únicamente las librerías compartidas mínimas de OpenCV y certificados SSL.

### 2.2 Sincronización y Arranque Ordenado con Healthchecks
- El backend depende del estado de salud de PostgreSQL:
  ```yaml
  depends_on:
    db:
      condition: service_healthy
  ```
- El contenedor `db` valida su preparación mediante `pg_isready`. Esto elimina fallos de arranque por carreras en la conexión inicial a la base de datos.
- El backend implementa su propio `HEALTHCHECK` consultando `/api/health`.

### 2.3 Gobernanza y Límites de Recursos
- **Backend:** Límite de 2.0 CPUs y 1024 MB de RAM (reserva de 256 MB) para proteger al host contra denegación de servicio (DoS) por procesamiento masivo de imágenes.
- **Base de Datos:** Límite de 1.0 CPU y 512 MB de RAM.

---

## 3. Guía Operativa de Comandos

### Iniciar los Servicios en Segundo Plano:
```bash
docker compose up -d --build
```

### Consultar el Estado de los Contenedores y Healthchecks:
```bash
docker compose ps
```

### Inspeccionar Logs en Tiempo Real:
```bash
docker compose logs -f backend
```

### Detener los Servicios Conservando los Datos:
```bash
docker compose down
```

### Detener los Servicios y Eliminar Volúmenes (Reset Completo):
```bash
docker compose down -v
```
