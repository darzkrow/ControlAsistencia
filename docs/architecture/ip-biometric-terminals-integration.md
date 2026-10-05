# Integracion de Terminales Biometricos y Control de Acceso IP Multi-Marca

Este documento describe la arquitectura, protocolos y mecanismos de integracion implementados en **Rapture Biometrics PRO 2.0** para operar con terminales fisicos de control de acceso y asistencia de diversas marcas lideres en el mercado (ZKTeco, Hikvision, Dahua, Anviz, Suprema, entre otros) que operan mediante **direcciones IP fijas**.

---

## 1. Viabilidad y Arquitectura de Integracion

### Es posible utilizar los controles de acceso existentes como captahuellas para la aplicacion?
**Si, 100% viable y compatible.**

Los dispositivos fisicos de control de acceso estan disenados con interfaces de comunicacion por red de alta fiabilidad. Nuestra arquitectura admite los dos paradigmas operativos estandar de la industria:

```text
+-------------------------------------------------------------------------------------------------+
|                               RAPTURE BIOMETRICS MULTI-VENDOR ARCHITECTURE                      |
+-------------------------------------------------------------------------------------------------+
                                                                                                   
 [ Terminal ZKTeco ] ----( Puerto 4370 TCP/UDP )----+                                              
 (IP: 192.168.1.201)                                 |                                              
                                                     +---> [ Adaptador Multi-Marca ]                 
 [ Lector Hikvision ] ---( Puerto 8000/80 ISAPI )----+     (backend/drivers/biometric_adapters.js)   
 (IP: 192.168.1.202)                                 |            |                                
                                                     |            v                                
 [ Torniquete Dahua ] ---( Puerto 80/37777 CGI )-----+     [ Buffer Ingestion Redis 7 ]             
 (IP: 192.168.1.203)                                 |     (punchQueue - Sub-milisegundo)          
                                                     |            |                                
 [ Modo Push / ADMS ] ---( HTTP POST Webhook )-------+            v                                
 (/api/v1/dispositivos/iclock/cdata)                       [ Insercion en Lotes PostgreSQL 16 ]    
                                                           (eventos_lector + jornada_diaria)       
```

---

## 2. Paradigmas de Comunicacion

### 2.1 Paradigma Pull (Sondeo y Conexion Directa por IP Fija)
El servidor backend de Rapture inicia conexiones directas hacia la direccion IP y puerto del terminal:
1. **Diagnostico de Conectividad (Ping TCP Socket)**:
   - Abre un socket TCP con timeout de 2.500 ms hacia la IP fija configurada.
   - Determina en tiempo real si el equipo esta en linea y calcula la latencia de red exacta en milisegundos.
2. **Descarga de Marcajes en Memoria (AttLog Pull)**:
   - Extrae los eventos de marcacion almacenados en la memoria flash interna del terminal.
   - Encola inmediatamente los registros en el pipeline de micro-lotes de Redis.
3. **Sincronizacion de Reloj (Time Sync)**:
   - Sincroniza la fecha y hora interna del terminal con el reloj del servidor para evitar discrepancias temporales en los marcajes.
4. **Enrolamiento Remoto (Terminal como Captahuellas de Red)**:
   - El administrador selecciona un colaborador en el portal web y presiona "Enrolar".
   - El servidor envia una orden al terminal IP asignado para activar su prisma optico.
   - El colaborador coloca su huella en el lector 3 veces; el terminal genera la plantilla estandarizada ISO/IEC 19794-2 y el servidor la guarda directamente en la tabla `empleados.template_huella`.

### 2.2 Paradigma Push (ADMS / Cloud Server / Webhooks HTTP)
El dispositivo fisico se configura apuntando a la IP y puerto de nuestro servidor:
- **ZKTeco ADMS (IClock)**:
  - En el menu del lector: `Menu -> Opciones -> Servidor de Nube / ADMS`.
  - Direccion del Servidor: IP del servidor Rapture (ej. `192.168.1.100`).
  - Puerto: `3000` (o puerto del Gateway).
  - URL de Push: `/api/v1/dispositivos/iclock/cdata`.
  - Cada vez que un colaborador coloca su dedo o rostro, el terminal envia un POST instantaneo.
- **Hikvision / Dahua HTTP Alert**:
  - En la interfaz web del equipo: `Configuration -> Network -> Advanced Settings -> HTTP Listening / Event Push`.
  - URL destino: `http://192.168.1.100:3000/api/v1/dispositivos/webhook/:serial`.

---

## 3. Matriz de Protocolos y Puertos por Fabricante

| Fabricante | Protocolo Nativo | Puerto Predeterminado | Tipo de Enrolamiento | Mecanismo de Comunicacion |
| :--- | :--- | :--- | :--- | :--- |
| **ZKTeco** | Standalone Protocol (ZK_TCP / ZK_UDP) | `4370` | Huella / Rostro / Tarjeta RFID | Socket TCP binario y ADMS Push HTTP |
| **Hikvision** | ISAPI REST (HTTP / JSON / XML) | `8000` o `80` | Rostro / Huella / Tarjeta Mifare | Peticiones HTTP Digest/Basic Auth y Notificaciones AcsEvent |
| **Dahua** | Dahua CGI / TCP InterConnect | `80` o `37777` | Huella / Rostro / PIN | Llamadas CGI HTTP y RecordFinder |
| **Anviz** | B-Net / TCP IP Protocol | `5005` | Huella dactilar | Socket TCP framing binario |
| **Generico** | Webhook HTTP REST | Configurable | Segun terminal | JSON POST estandarizado hacia Rapture |

---

## 4. Endpoints de Gestion en la API

Todas las rutas operan bajo el prefijo centralizado versionado (`/api/v1`):

### 4.1 Catalogo y CRUD de Terminales
- `GET /api/v1/admin/dispositivos`: Retorna la lista de terminales con estado de conexion, latencia, sede asignada y contador de marcaciones.
- `POST /api/v1/admin/dispositivos`: Registra un nuevo terminal especificando nombre, marca, modelo, IP fija, puerto, protocolo, clave de comunicacion y sede.
- `PUT /api/v1/admin/dispositivos/:id`: Modifica la configuracion de red o asignacion de sede del terminal.
- `DELETE /api/v1/admin/dispositivos/:id`: Elimina un terminal del directorio de red.

### 4.2 Diagnostico, Sincronizacion y Enrolamiento Remoto
- `POST /api/v1/admin/dispositivos/:id/ping`: Ejecuta un diagnostico por socket TCP hacia la IP fija y actualiza la latencia en milisegundos.
- `POST /api/v1/admin/dispositivos/:id/sincronizar`: Descarga eventos pendientes en la memoria del terminal y los canaliza al pipeline de insercion masiva.
- `POST /api/v1/admin/dispositivos/:id/enrolar-captura`: Activa el prisma del terminal IP para capturar la huella de una cedula especifica y actualizar su registro en la base de datos.
- `POST /api/v1/dispositivos/iclock/cdata`: Receptor Push para terminales ZKTeco con modulo ADMS activado.
- `POST /api/v1/dispositivos/webhook/:serial`: Receptor de eventos push para terminales Hikvision/Dahua.

---

## 5. Procedimiento Paso a Paso para Conectar un Terminal Fisico

1. **Configuracion de Red en el Terminal**:
   - Asignar una IP estatica dentro de la misma subred que el servidor Rapture (ejemplo: `192.168.1.201`, mascara `255.255.255.0`, puerta de enlace `192.168.1.1`).
   - Habilitar el protocolo de comunicacion (ejemplo: en ZKTeco, verificar que el puerto TCP `4370` este activo y que la clave de comunicacion coincida, por defecto `0`).

2. **Alta en el Portal Administrativo de Rapture**:
   - Ingresar a **Portal Admin -> Dispositivos IP**.
   - Presionar **Nuevo Dispositivo IP**.
   - Indicar Nombre (*Torniquete Entrada Norte*), Marca (*ZKTeco*), IP (*192.168.1.201*), Puerto (*4370*) y Sede asignada.
   - Presionar **Registrar Dispositivo**.

3. **Verificacion de Conectividad**:
   - En la tarjeta del terminal registrado, hacer clic en **Probar IP**.
   - El sistema realizara el handshake TCP de inmediato. Si la respuesta es satisfactoria, el badge cambiara a verde **EN LINEA** con la latencia registrada (ej. `12 ms`).

4. **Uso como Captahuellas para Nuevos Empleados**:
   - En el modulo de colaboradores o desde la misma tarjeta de dispositivo, hacer clic en **Enrolar**.
   - Seleccionar el colaborador al cual se le asociara la huella.
   - El colaborador colocara su dedo en el prisma del lector; la huella quedara inmediatamente disponible para validar asistencias en toda la red de la organizacion.
