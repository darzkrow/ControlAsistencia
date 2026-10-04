# Aplicacion Movil y Tablet: Captura Biometrica y Geovallas GPS Anti-Fraude

## 1. Vision General del Sistema

Este modulo proporciona una aplicacion disenada en **React Native** optimizada tanto para **Tablets** (modo kiosko horizontal en mostradores) como para **Smartphones** (supervisores y personal de campo).

Permite registrar la asistencia del colaborador mediante una **doble verificacion biometrica**:
1. **Captura Dactilar**: Lector de huellas biometrico capacitivo u optico (o sensor de huellas integrado del dispositivo).
2. **Captura Fotografica Facial**: Toma instantanea de fotografia frontal con guia ovalada para prueba de vida y validacion de presencia física.

---

## 2. Logica de Geovalla GPS y Deteccion de Fraude

### Requerimiento Operativo
Cuando un colaborador marca asistencia mediante la aplicacion movil o tablet:
* El dispositivo obtiene las coordenadas GPS de alta precision (`latitud`, `longitud`, `precision`).
* El sistema calcula la distancia geodesica en metros entre la posicion del dispositivo y la sede asignada utilizando la formula de Haversine.
* **Si la marcacion ocurre DENTRO del perimetro permitido (`distancia <= radio_tolerancia`)**:
  * Se registra como asistencia regular dentro de sede.
* **Si la marcacion ocurre FUERA del perimetro permitido (`distancia > radio_tolerancia`)**:
  * **La marcacion NO se bloquea**: Se captura la huella, la foto y las coordenadas exactas.
  * **Se marca automaticamente con bandera de ALERTA DE FRAUDE / FUERA DE SEDE**.
  * Se notifica de forma inmediata al panel de Recursos Humanos (RRHH).
  * RRHH dispone de la distancia excedida, enlace directo a Google Maps, fecha, hora en formato de 12 horas y foto del colaborador para verificar si el colaborador estaba en comision de servicio justificada o si se trato de un intento de marcacion fraudulenta.

---

## 3. Algoritmo Geodesico de Haversine

El calculo de la distancia se realiza tanto en el dispositivo movil como en el backend para evitar manipulacion del cliente:

$$\Delta\phi = \frac{(\text{lat}_2 - \text{lat}_1) \cdot \pi}{180}$$
$$\Delta\lambda = \frac{(\text{lon}_2 - \text{lon}_1) \cdot \pi}{180}$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1 - a})$$
$$d = R \cdot c \quad (R = 6,371,000\text{ metros})$$

---

## 4. Estructura del Proyecto Mobile (`mobile/`)

```
mobile/
├── package.json               # Dependencias Expo / React Native
├── app.json                   # Permisos de camara, ubicacion fina y biometria
├── tsconfig.json              # Configuracion de TypeScript estricto
├── babel.config.js            # Configuracion de Babel
├── index.js                   # Registro de componente raiz
├── App.tsx                    # Componente raiz y contenedor de vista segura
└── src/
    ├── config/
    │   └── constants.ts       # URLs base, temas visuales y sedes por defecto
    ├── types/
    │   └── index.ts           # Definiciones TypeScript de geocercas y marcaciones
    ├── services/
    │   ├── api.ts             # Cliente HTTP y sincronizacion de cola offline
    │   ├── locationService.ts # Adquisicion GPS y evaluacion de geovalla
    │   ├── biometricService.ts# Autenticacion por sensor dactilar y de rostro
    │   └── storageService.ts  # Almacenamiento local e historial de marcaciones
    ├── components/
    │   ├── HeaderBar.tsx      # Barra superior con reloj 12h y estado GPS
    │   ├── GeofenceRadar.tsx  # Radar visual de proximidad y banner de auditoria
    │   ├── FingerprintScannerPad.tsx # Lector dactilar interactivo
    │   ├── CameraFaceCapture.tsx     # Visor de camara con guia oval facial
    │   └── ResultModal.tsx    # Modal con resultado y alerta si fue fuera de sede
    └── screens/
        ├── MainKioskScreen.tsx    # Pantalla principal adaptable a tablet y telefono
        ├── SettingsModal.tsx      # Configuracion de IP de servidor y seleccion de sede
        └── AuditHistoryModal.tsx  # Historial local de marcaciones tomadas en el equipo
```

---

## 5. Endpoints del Backend Integrados

### 1. `GET /api/v1/sedes/geocercas`
Retorna las sedes activas con sus coordenadas geograficas y radios de tolerancia:
```json
[
  {
    "id": 1,
    "codigo": "SEDE-CENTRAL",
    "nombre": "Sede Central Administrativa",
    "latitud": "10.4910000",
    "longitud": "-66.8780000",
    "radio_tolerancia_metros": 150
  },
  {
    "id": 2,
    "codigo": "SEDE-NORTE",
    "nombre": "Planta Tecnológica e I+D",
    "latitud": "10.2230000",
    "longitud": "-67.9860000",
    "radio_tolerancia_metros": 200
  }
]
```

### 2. `POST /api/v1/asistencia/movil`
Registra la marcacion biometrica y evalua la geovalla:
* **Body**:
```json
{
  "cedula": 19543210,
  "tipo_evento": "ENTRADA",
  "metodo_auth": "HUELLA_FACIAL",
  "latitud": 10.515,
  "longitud": -66.915,
  "precision_gps": 8.5,
  "sede_id": 1,
  "foto_base64": "...",
  "template_huella": "FP_TOKEN_...",
  "dispositivo_info": "Tablet Samsung Galaxy Tab Active4 Pro"
}
```
* **Respuesta (Marcacion fuera de sede)**:
```json
{
  "exito": true,
  "evento_id": 115,
  "cedula": 19543210,
  "nombre_completo": "María Alejandra Rodríguez",
  "departamento": "Recursos Humanos",
  "tipo_evento": "ENTRADA",
  "metodo_auth": "HUELLA_FACIAL",
  "fuera_de_sede": true,
  "distancia_metros": 4846,
  "radio_tolerancia_metros": 150,
  "alerta_fraude_rrhh": true,
  "sede_nombre": "Sede Central Administrativa",
  "hora_12h": "04:35:58 p. m.",
  "mensaje": "Marcacion registrada con ALERTA: Fuera de sede (4846m > 150m). Marcada para revision de RRHH."
}
```

### 3. `GET /api/v1/asistencia/alertas-fraude`
Lista todas las marcaciones efectuadas fuera del perimetro para revision de Recursos Humanos.

### 4. `PUT /api/v1/asistencia/alertas-fraude/:id/auditar`
Permite a RRHH aprobar/justificar la marcacion (ej. comision de servicio externa) o confirmar la infraccion.

---

## 6. Instrucciones de Ejecucion y Despliegue

### Requisitos Previos
* Node.js v18+ y npm instalado.
* Expo CLI (`npm install -g expo-cli` o via `npx expo`).
* Android Studio (para emulador Android) o dispositivo fisico con depuracion USB / Expo Go.

### Pasos para Ejecutar la App Mobile
1. Navegar al directorio de la aplicacion movil:
   ```bash
   cd mobile
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo Metro / Expo:
   ```bash
   npm start
   ```
4. Para ejecutar directamente en un emulador o dispositivo Android:
   ```bash
   npm run android
   ```

### Generacion de APK para Instalacion en Tablets Corporativas
Para generar el archivo APK independiente (instalable directamente en tablets y telefonos sin tienda):
```bash
npx eas-cli build --platform android --profile preview
```
O compilar localmente con Gradle:
```bash
npx expo prebuild
cd android
./gradlew assembleRelease
```
El archivo APK generado se encontrara en: `android/app/build/outputs/apk/release/app-release.apk`.
