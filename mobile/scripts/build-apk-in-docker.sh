#!/usr/bin/env bash
set -e

echo "[BUILD] Iniciando compilacion de APK en contenedor Android..."
cd /workspace/android

# Permisos de ejecucion a gradlew
chmod +x gradlew

# Compilar APK en modo release con keystore de depuracion/distribucion interna
echo "[BUILD] Ejecutando Gradle assembleRelease..."
./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=armeabi-v7a,arm64-v8a

echo "[BUILD] Compilacion finalizada exitosamente."
ls -lh app/build/outputs/apk/release/
