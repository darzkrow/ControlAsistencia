# Arquitectura de Cache y Buffer de Ingestion por Lotes (Micro-Batching)

## 1. Analisis del Problema: Cuello de Botella y Bloqueo en Base de Datos

En sistemas de control de asistencia biometrica con terminales fisicos (quioscos, molinetes y camaras de reconocimiento facial), el patron de trafico no es uniforme, sino que presenta picos extremos concentrados en ventanas de tiempo muy reducidas (horas de entrada y salida de turno, por ejemplo entre 07:45 y 08:15 AM).

### Sintomas del Modelo Sincrono Directo Tradicional
1. **Contencion de Bloqueo de Fila (Row-Level Lock Contention):**
   Al registrar una marcacion, multiples terminales intentan consultar y bloquear la fila del dia actual del colaborador mediante transacciones `SELECT ... FOR UPDATE` sobre la tabla `jornada_diaria`. Cuando ocurren reintentos o lecturas dobles casi simultaneas, se producen esperas de bloqueo (*lock waits*), agotamiento de conexiones en el pool y eventuales bloqueos mutuos (*deadlocks* codigo PostgreSQL `40P01`).
2. **Saturacion de Escritura en Registro de Transacciones (WAL - Write-Ahead Logging):**
   Cada peticion HTTP individual genera su propia transaccion ACID (`BEGIN` -> `INSERT/UPDATE` -> `COMMIT`), lo que obliga a PostgreSQL a sincronizar fisicamente el WAL en disco para cada marcaje individual (*fsync*), reduciendo la capacidad maxima de transacciones concurrentes.
3. **Latencia Inaceptable en el Lector:**
   El empleado frente al quiosco debe esperar a que culmine la transaccion completa de red y disco (entre 45 y 200 ms). Si la base de datos se ralentiza, se forman largas filas fisicas en los accesos peatonales.
4. **Consultas Redundantes de Datos Estaticos:**
   En cada marcacion se ejecutan consultas repetitivas a las tablas `empleados`, `turnos_horarios` y `sedes` para validar datos que raramente cambian durante la jornada laboral.

---

## 2. Evaluacion Comparativa de Tecnologias

A continuacion se presenta la evaluacion tecnica y de idoneidad entre **Redis**, **RabbitMQ** y **Apache Kafka** para el caso de uso especifico de control de acceso y asistencia biometrica:

| Criterio de Evaluacion | Redis (Streams + Cache) | RabbitMQ (AMQP) | Apache Kafka (Event Streaming) |
| :--- | :--- | :--- | :--- |
| **Latencia de Respuesta** | **Menor a 1 ms** (100% en memoria RAM) | 5 a 15 ms (Enrutamiento en broker) | 10 a 25 ms (Persistencia distribuida en log) |
| **Doble Proposito: Cache + Cola** | **Si (Nativo)**: Almacena perfiles de colaboradores, cooldowns con TTL y colas persistidas (Streams/Listas). | **No**: Es un broker puro de mensajeria. Requiere un Redis adicional para cache de lecturas. | **No**: Es un log de eventos distribuido. No esta disenado para cache clave-valor de baja latencia. |
| **Control de Anti-Passback (Cooldown)** | **Optimo**: Comandos atomicos `SET key val EX 15 NX` en microsegundos. | Inadecuado: Requiere persistencia externa para verificar estado previo. | Inadecuado: La lectura puntual por clave no es nativa sin capas como KTables/RocksDB. |
| **Rendimiento de Ingestion (Throughput)** | Alto (100,000+ ops/seg por nodo). | Medio-Alto (20,000 a 50,000 msgs/seg). | Extremo (1,000,000+ msgs/seg en clusters). |
| **Huella de Recursos y Memoria** | **Minima**: ~25 a 50 MB RAM, binario en C. | Media: ~150 a 300 MB RAM, entorno Erlang/OTP. | Alta: ~1 a 2 GB RAM minima, JVM (Java) + Zookeeper/KRaft. |
| **Complejidad Operacional** | **Baja**: Contenedor unico ultraliviano, configuracion directa. | Media: Administracion de exchanges, colas, politicas de reintento y vhosts. | Muy Alta: Gestion de particiones, offsets, replicas, zookeeper/kraft y almacenamiento en disco. |
| **Veredicto Arquitectonico** | **SELECCIONADO (Nivel Optimo)** | Viable pero genera redundancia | Desaconsejado (Sobre-ingenieria innecesaria) |

### Conclusion del Analisis
- **Apache Kafka** esta disenado para telemetria masiva y streaming distribuido entre decenas de microservicios con millones de eventos por segundo. Para una solucion de asistencia en sedes corporativas o plantas industriales, Kafka introduce una complejidad operativa y un consumo de recursos desproporcionado sin resolver la necesidad de cache de lectura de colaboradores.
- **RabbitMQ** ofrece excelente enrutamiento y garantias de entrega, pero carece de capacidades de almacenamiento clave-valor en memoria, por lo que obligaria a incorporar igualmente una instancia de Redis para resolver la validacion rapida y el anti-passback.
- **Redis 7** representa la solucion idonea: resuelve de manera unificada la **cache de lectura ultra-rapida** de empleados y horarios, la **politica anti-passback por TTL**, y actua como **buffer en memoria** para que un worker desacoplado realice micro-lotes (*micro-batching*) hacia PostgreSQL.

---

## 3. Diseno Arquitectonico de la Solucion

```
+--------------------------------------------------------------------------------+
|                         TERMINALES Y QUIOSCOS BIOMETRICOS                      |
+--------------------------------------------------------------------------------+
                                       |
                                       | POST /api/escaneo (HTTP REST, < 5 ms)
                                       v
+--------------------------------------------------------------------------------+
|                         CAPA 1: FAST GATEWAY & VALIDATION                      |
|                                                                                |
| 1. Verificacion atomica de Cooldown Anti-Passback en Redis (TTL 10s)           |
| 2. Validacion de datos de empleado y turno en Redis Cache (< 0.5 ms)           |
| 3. Si cache miss: consulta unica a PostgreSQL y poblado de cache con TTL 30m   |
+--------------------------------------------------------------------------------+
             |                                                  |
             | (Respuesta Inmediata al Lector)                 | (Evento a Buffer)
             v                                                  v
+-----------------------------+               +----------------------------------+
| RESPUESTA 200 OK AL LECTOR   |               | CAPA 2: BUFFER ASINCRONO         |
| "Bienvenido, Juan Carlos!    |               |                                  |
| Marcacion en proceso..."     |               | Redis Stream / In-Memory Queue   |
| (Latencia total: ~3-5 ms)    |               | 'biometric:punch:buffer'         |
+-----------------------------+               +----------------------------------+
                                                                |
                                                                | Consumo en micro-lotes
                                                                | (Cada 200 ms o al llegar a 50 eventos)
                                                                v
                                              +----------------------------------+
                                              | CAPA 3: MICRO-BATCH WORKER       |
                                              |                                  |
                                              | - Agrupacion de eventos          |
                                              | - 1 sola transaccion SQL         |
                                              | - Multi-Row INSERT eventos_lector|
                                              | - Batch UPSERT en jornada_diaria |
                                              +----------------------------------+
                                                                |
                                                                | Escritura ACID consolidada
                                                                v
                                              +----------------------------------+
                                              | CAPA 4: POSTGRESQL 16 (api_db)   |
                                              |                                  |
                                              | CERO esperas de bloqueo de fila  |
                                              | CERO transacciones concurrentes  |
                                              | 95% reduccion en I/O de disco    |
                                              +----------------------------------+
```

---

## 4. Detalle de las Capas de Optimizacion

### Capa 1: Cache-Aside de Colaboradores y Turnos
- **Estructura en Cache:** Claves `emp:{cedula}` que contienen el objeto serializado del colaborador (cédula, nombre completo, departamento, turno asignado, tolerancia y estado activo).
- **Politica de Invalidacion:** 
  - Tiempo de vida (TTL) base de 30 minutos.
  - Invalidacion proactiva inmediata (`DEL emp:{cedula}`) ante operaciones administrativas de actualizacion de datos, cambio de turno o desactivacion del trabajador.

### Capa 2: Anti-Passback Atomico de Ultra-Baja Latencia
- En lugar de consultar PostgreSQL para determinar si el empleado acaba de registrar su acceso, el gateway ejecuta:
  ```bash
  SET cooldown:{cedula} 1 EX 10 NX
  ```
- Si el comando retorna `nil`, el sistema detecta de forma instantanea que el colaborador intento marcar dos veces seguidas en menos de 10 segundos, retornando una alerta al quiosco en menos de 1 milisegundo y evitando trabajo innecesario a la base de datos.

### Capa 3: Buffer de Ingestion y Micro-Batching
- Cada marcacion aceptada genera un objeto de evento estructurado:
  ```json
  {
    "empleado_cedula": 22789456,
    "timestamp": "2026-10-04T12:00:00.000Z",
    "metodo_auth": "FACIAL",
    "tipo_evento": "entrada",
    "puntualidad": "Puntual",
    "minutos_retardo": 0
  }
  ```
- El evento se ingresa en el buffer en memoria persistido en Redis.
- El quiosco recibe confirmacion instantanea, permitiendo el paso del trabajador por el torniquete sin demoras.

### Capa 4: Persistencia Agrupada en PostgreSQL
El worker en segundo plano vacia el buffer ejecutando consultas optimizadas por lote:

1. **Insercion Masiva de Auditoria (`eventos_lector`):**
   ```sql
   INSERT INTO eventos_lector (empleado_cedula, fecha_hora, tipo_evento, metodo_auth)
   VALUES 
     ($1, $2, $3, $4),
     ($5, $6, $7, $8),
     ...
     ($N1, $N2, $N3, $N4);
   ```
2. **Actualizacion por Lotes de Jornada Diaria (`jornada_diaria`):**
   Para evitar bloquear filas concurrentemente, el worker agrupa los eventos del mismo empleado dentro del lote y ejecuta actualizaciones consolidadas en una sola transaccion por bloque, eliminando el riesgo de interbloqueos (*deadlocks*).

---

## 5. Politica de Tolerancia a Fallos (Graceful Degradation)

Si el servicio Redis sufriera una interrupcion temporal o reinicio:
1. El backend detecta la perdida de conexion a traves de su cliente con circuito de control (*circuit breaker*).
2. Se activa automaticamente el **Buffer Local de Proceso**: una cola FIFO en memoria protegida dentro del runtime Node.js que sigue agrupando las transacciones.
3. Si la memoria local alcanza su umbral de seguridad, el sistema conmuta a **Escritura Directa Transaccional** en PostgreSQL, asegurando que ningun marcaje de asistencia sea descartado.
4. Una vez restaurado Redis, el backend restablece la cache y sincroniza los contadores sin requerir intervencion manual.
