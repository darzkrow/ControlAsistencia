@echo off
echo ==============================================================================
echo COMPILACION AUTOMATIZADA DE APK EN CONTENEDOR DOCKER ANDROID
echo ==============================================================================

if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Archivo .env no encontrado en mobile. Inicializando desde .env.example...
        copy ".env.example" ".env"
    )
)

echo [1/3] Construyendo imagen de compilacion Android con Node.js y SDK 34...
docker build -t rapture-android-builder -f Dockerfile.android-builder .
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo al construir la imagen Docker.
    exit /b %ERRORLEVEL%
)

echo [2/3] Ejecutando compilacion nativa de Android en contenedor...
docker run --rm -v "rapture-gradle-cache:/root/.gradle" -v "rapture-ndk-cache:/opt/android-sdk-linux/ndk" -v "%cd%:/workspace" -w /workspace/android rapture-android-builder bash -c "sed -i 's/\r$//' gradlew && chmod +x gradlew && ./gradlew assembleRelease --no-daemon"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo durante Gradle assembleRelease.
    exit /b %ERRORLEVEL%
)

echo [3/3] Copiando archivo APK generado a la carpeta raiz...
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    copy /Y "android\app\build\outputs\apk\release\app-release.apk" "..\rapture-biometrics-mobile.apk"
    echo.
    echo ==============================================================================
    echo EXITO: El archivo APK ha sido generado en:
    echo   %cd%\..\rapture-biometrics-mobile.apk
    echo ==============================================================================
) else (
    echo [ALERTA] Archivo APK no encontrado en ruta de release esperada.
)
