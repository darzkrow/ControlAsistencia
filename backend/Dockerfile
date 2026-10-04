# ==============================================================================
# Multi-Stage Dockerfile para el Backend Biométrico Rapture (Rust + Axum + OpenCV)
# Aplica directrices de seguridad, mínimo privilegio (Non-Root) y optimización de caché.
# ==============================================================================

# ------------------------------------------------------------------------------
# Etapa 1: Constructor (Builder)
# ------------------------------------------------------------------------------
FROM rust:1.85-bookworm AS builder

WORKDIR /app

# Instalar dependencias nativas para compilar bindings de C++ de OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    clang \
    libclang-dev \
    libopencv-dev \
    pkg-config \
    cmake \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copiar manifiestos de dependencias para aprovechar la caché de capas de Docker
COPY Cargo.toml Cargo.lock ./

# Crear esqueleto temporal para precompilar dependencias de terceros
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copiar el código fuente completo y los modelos de IA
COPY src ./src
COPY assets ./assets

# Tocar src/main.rs para actualizar timestamp y compilar el binario final
RUN touch src/main.rs && \
    cargo build --release && \
    strip target/release/captador_huellas

# ------------------------------------------------------------------------------
# Etapa 2: Imagen de Producción (Runtime Minimal y Seguro)
# ------------------------------------------------------------------------------
FROM debian:bookworm-slim AS runner

WORKDIR /app

# Instalar librerías compartidas de OpenCV, SSL y curl para el healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopencv-dev \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# POLÍTICA DE SEGURIDAD: Usuario no privilegiado (Least Privilege)
# UID/GID 10001 dedicado para mitigar riesgos de escalada de privilegios
RUN groupadd -g 10001 rapture && \
    useradd -u 10001 -g rapture -s /bin/sh -M -d /app rapture

# Crear directorios de trabajo y almacenamiento persistente con permisos adecuados
RUN mkdir -p /app/uploads/fotos /app/assets && \
    chown -R rapture:rapture /app

# Copiar binario compilado y assets de la etapa constructora
COPY --from=builder --chown=rapture:rapture /app/target/release/captador_huellas /app/captador_huellas
COPY --from=builder --chown=rapture:rapture /app/assets/haarcascade_frontalface_default.xml /app/assets/haarcascade_frontalface_default.xml

# Variables de entorno predeterminadas para entorno en contenedor
ENV SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3000 \
    RUST_LOG=info

# Exponer el puerto de la API Axum
EXPOSE 3000

# POLÍTICA DE RESILIENCIA: Healthcheck periódico mediante endpoint /api/health
HEALTHCHECK --interval=20s --timeout=4s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Cambiar a usuario no root
USER rapture:rapture

# Definir punto de entrada
ENTRYPOINT ["/app/captador_huellas"]
