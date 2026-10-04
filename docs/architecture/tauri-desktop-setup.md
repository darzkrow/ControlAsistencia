# Guía de Empaquetado de Escritorio con Tauri (Windows .exe)

Esta guía describe cómo convertir el frontend web en una **aplicación nativa de escritorio para Windows** utilizando **Tauri v2**, permitiendo acceso directo de bajo nivel (FFI en Rust) a los SDKs de lectores de huella dactilar USB (DigitalPersona, SecuGen, ZKTeco).

---

## 1. Requisitos Previos en Windows
- **Node.js 18+** y **npm** (ya instalados).
- **Rust y Cargo**: Instalar mediante [rustup.rs](https://rustup.rs/).
- **Visual Studio Build Tools**: C++ build tools para Windows (necesarios para compilar binarios nativos en Rust).

---

## 2. Inicialización de Tauri en la Carpeta `frontend`

Desde la carpeta `frontend`:

```bash
cd frontend
npm install --save-dev @tauri-apps/cli @tauri-apps/api
npx tauri init
```

Durante el asistente de inicialización interactivo:
- **App name:** `RaptureBiometrics`
- **Window title:** `Rapture Biometrics - Kiosko y Captador de Huellas`
- **Web assets dev URL:** `http://localhost:5173`
- **Frontend build command:** `npm run build`
- **Frontend distribution directory:** `dist`

---

## 3. Integración con el Lector Físico de Huellas (Rust FFI en `src-tauri`)

En `frontend/src-tauri/src/main.rs`, Tauri expone comandos invocables desde React:

```rust
// Ejemplo de comando Tauri para invocar el SDK C del Huellero
#[tauri::command]
fn capturar_huella_usb() -> Result<String, String> {
    // Aquí se invoca la DLL del fabricante (ej. dpfpapi.dll o libzkfp.dll)
    // vía FFI o libloading para leer la muestra dactilar
    println!("Sensor óptico activado. Esperando huella...");
    
    // Retorna el template biométrico en Base64 o formato ISO
    Ok("ISO_19794_TEMPLATE_BYTES_BASE64...".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![capturar_huella_usb])
        .run(tauri::generate_context!())
        .expect("Error ejecutando aplicación Tauri");
}
```

Y en React (`src/components/BiometricHUD.tsx`):
```typescript
import { invoke } from '@tauri-apps/api/core';

// Si corre dentro de Tauri, invoca directamente el hardware
const template = await invoke('capturar_huella_usb');
```

---

## 4. Ejecución y Compilación del Binario

### Modo Desarrollo:
```bash
npx tauri dev
```

### Generación del Instalador y `.exe`:
```bash
npx tauri build
```
El ejecutable resultante se genera en `frontend/src-tauri/target/release/RaptureBiometrics.exe` con un consumo de memoria inferior a 40 MB de RAM.
