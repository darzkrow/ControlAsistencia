# Manual de Operacion Paso a Paso - Rapture Biometrics PRO 2.0

Esta guia describe detalladamente el procedimiento operativo para usuarios finales (colaboradores que marcan asistencia en el Kiosko) y administradores del sistema (personal de Recursos Humanos y Oficiales de Seguridad).

---

## Indice de Procedimientos
- [Paso 1: Marcaje de Asistencia en el Kiosko Biometrico](#paso-1-marcaje-de-asistencia-en-el-kiosko-biometrico)
- [Paso 2: Acceso Seguro al Portal Administrativo](#paso-2-acceso-seguro-al-portal-administrativo)
- [Paso 3: Configuracion de la Estructura Organizativa](#paso-3-configuracion-de-la-estructura-organizativa)
- [Paso 4: Directorio de Personal y Enrolamiento Biometrico](#paso-4-directorio-de-personal-y-enrolamiento-biometrico)
- [Paso 5: Monitoreo y Auditoria de Asistencias](#paso-5-monitoreo-y-auditoria-de-asistencias)
- [Paso 6: Administracion de Seguridad y Matriz de Modelos](#paso-6-administracion-de-seguridad-y-matriz-de-modelos)
- [Paso 7: Resolucion de Problemas Frecuentes (Troubleshooting)](#paso-7-resolucion-de-problemas-frecuentes-troubleshooting)

---

## Paso 1: Marcaje de Asistencia en el Kiosko Biometrico

El Kiosko se encuentra en la pantalla de inicio del sistema (`http://localhost:5173/`).

### Procedimiento de Marcaje:
1. **Seleccion de Modalidad Biometrica:**
   - En la parte superior del visor HUD, seleccione uno de los tres modos disponibles:
     - **Reconocimiento Facial:** Utiliza la camara web en vivo.
     - **Lector de Huella:** Utiliza el sensor optico de huellas.
     - **Modo Dual:** Exige validacion simultanea de rostro y huella dactilar.
2. **Ingreso del Numero de Identificacion:**
   - Escriba su numero de cedula o identificador numerico utilizando el teclado tactil en pantalla o mediante el teclado fisico de la estacion.
3. **Posicionamiento:**
   - Si utiliza el modo facial, asegurese de mirar de frente al cuadrante del visor HUD. El indicador cambiara a verde cuando el rostro sea encuadrado adecuadamente.
   - Si utiliza el modo dactilar, apoye la yema del dedo sobre el sensor de huella hasta escuchar el tono de confirmacion.
4. **Validacion y Confirmacion:**
   - Presione el boton **Escanear y Registrar**.
   - El sistema validara en el backend el estado del colaborador.
   - Si la persona esta autorizada, se mostrara la tarjeta `ResultCard` confirmando el nombre completo, departamento, tipo de evento (`Entrada` o `Salida`) y minutos laborados acumulados.
   - Si la cedula no existe o esta inactiva, se notificara el rechazo o registro como visitante.

---

## Paso 2: Acceso Seguro al Portal Administrativo

1. **Ingreso a la Pasarela:**
   - Desde la cabecera superior del Kiosko, haga clic en el boton **PORTAL ADMIN**.
2. **Autenticacion con Credenciales:**
   - Ingrese su nombre de usuario o correo corporativo registrado en el campo `Identificador`.
   - Ingrese su contrasena administrativa en el campo `Contrasena`.
   - Presione el boton **Iniciar Sesion**.
3. **Credenciales Iniciales de Prueba:**
   - **Super Administrador:** Usuario `admin`, Contrasena `Admin2026!*` (Control global total).
   - **Administrador RRHH:** Usuario `rrhh_directora`, Contrasena `Admin2026!*` (Gestion de sedes y personal).
   - **Supervisor Sede Norte:** Usuario `supervisor_norte`, Contrasena `Admin2026!*` (Restringido a Sede 2).
   - **Auditor de Cumplimiento:** Usuario `auditor_externo`, Contrasena `Admin2026!*` (Solo lectura y reportes).

---

## Paso 3: Configuracion de la Estructura Organizativa

Una vez autenticado en el Portal Administrativo, acceda a la pestana **Organizacion**:

### 3.1 Gestion de Sedes Fisicas:
1. En la seccion **Sedes y Sucursales**, observe el listado de campus existentes.
2. Para agregar una sede:
   - Presione **Nueva Sede**.
   - Diligencie el Codigo de Sede (ej. `SEDE-OESTE`), Nombre Oficial, Direccion y Ciudad.
   - Presione **Guardar Sede**.

### 3.2 Gestion de Departamentos:
1. En la seccion **Departamentos y Oficinas**, filtre o seleccione la sede de destino.
2. Presione **Nuevo Departamento**.
3. Ingrese el codigo y nombre del area (ej. `DEP-FINANZAS`, `Gerencia de Finanzas y Contabilidad`).
4. Presione **Guardar Departamento**.

### 3.3 Gestion de Cargos Laborales:
1. En la seccion **Cargos y Posiciones**, seleccione el departamento responsable.
2. Defina el nombre del cargo y la descripcion funcional.
3. Presione **Guardar Cargo**.

### 3.4 Gestion de Turnos y Reglas de Puntualidad:
1. En la seccion **Turnos y Horarios**:
2. Configure la hora de entrada oficial (ej. `08:00:00`) y hora de salida (ej. `17:00:00`).
3. Ajuste los minutos de gracia en **Tolerancia** (ej. 15 minutos). Toda marcacion posterior a la hora pactada mas la tolerancia se clasificara automaticamente como `Retardo`.
4. Defina los dias de la semana laborales (ej. `L,M,X,J,V`).

---

## Paso 4: Directorio de Personal y Enrolamiento Biometrico

En el Portal Administrativo, acceda a la pestana **Colaboradores**:

1. **Creacion de un Nuevo Colaborador:**
   - Haga clic en el boton **Nuevo Colaborador**.
   - Ingrese el numero de cedula o ID nacional (numerico).
   - Ingrese el nombre completo, correo corporativo y telefono.
   - Asigne la Sede fisica, Departamento, Cargo y Turno de evaluacion.
2. **Enrolamiento Biometrico:**
   - En el recuadro de **Enrolamiento de Huella Dactilar**, coloque el dedo en el sensor o presione el captador digital para generar el template biometrico ISO/IEC.
3. **Confirmacion:**
   - Presione **Registrar Colaborador**. El usuario quedara activo inmediatamente para marcar en cualquier kiosko de la empresa.
4. **Activacion / Desactivacion:**
   - Si un trabajador cesa funciones o esta suspendido, utilice el interruptor de estado en la tabla para desactivar su cuenta sin borrar su historial de auditoria.

---

## Paso 5: Monitoreo y Auditoria de Asistencias

En el Portal Administrativo, acceda a la pestana **Auditoria Asistencias**:

1. **Visualizacion de la Jornada:**
   - La tabla muestra cada marcaje procesado en el dia: hora exacta de entrada, hora de salida, estado de la jornada (`En curso` o `Completada`), minutos laborados y clasificacion de puntualidad (`Puntual` o `Retardo`).
2. **Filtros por Criterio:**
   - Utilice el selector de sede para auditar jornadas por instalacion especifica.
   - Filtre por nombre o numero de cedula en el campo de busqueda.
3. **Exportacion de Informes:**
   - Si su rol cuenta con permiso de exportacion, presione el boton **Exportar Reporte (CSV)** para descargar el consolidado para liquidacion de nomina.

---

## Paso 6: Administracion de Seguridad y Matriz de Modelos

En el Portal Administrativo, acceda a la pestana **Seguridad & Modelos** (Disponible para perfiles `SUPER_ADMIN` o con autorizacion sobre el modelo de seguridad):

### 6.1 Matriz de Politicas por Modelo:
1. Seleccione un rol de la lista izquierda (ej. `ADMIN_RRHH` o `SUPERVISOR_SEDE`).
2. En la matriz derecha, vera los 7 modelos del sistema: `Sedes`, `Departamentos`, `Cargos`, `Turnos`, `Empleados`, `Asistencias` y `Seguridad`.
3. Ajuste las casillas de verificacion para cada modelo:
   - **Crear:** Permite registrar nuevas entidades.
   - **Leer:** Permite consultar registros.
   - **Actualizar:** Permite modificar datos existentes.
   - **Eliminar:** Permite dar de baja registros.
   - **Exportar:** Permite descargar informes.
4. Para modelos con soporte geografico, ajuste el campo **Alcance**:
   - `Global`: Acceso irrestricto en toda la organizacion.
   - `Sede`: Restringido unicamente a la sede asignada al operador.
5. Presione **Guardar Politicas de Modelos**.

### 6.2 Administracion de Usuarios y Desbloqueo:
1. En la pestana **Usuarios del Sistema**, consulte los operadores administrativos activos.
2. Para agregar un nuevo operador:
   - Presione **Nuevo Usuario**.
   - Defina el nombre de usuario (minimo 3 caracteres), correo, contrasena (minimo 8 caracteres), rol asignado y sede asociada.
   - Presione **Crear Usuario**.
3. **Desbloqueo tras Intentos Fallidos:**
   - Si un operador excedio los 5 intentos y su cuenta se encuentra bloqueada, aparecera un boton **Desbloquear Cuenta** que restablece su acceso inmediatamente.

### 6.3 Bitacora de Auditoria Forense:
- En la subpestana **Bitacora de Auditoria**, consulte el registro inmutable de todos los eventos del sistema: inicios de sesion, cambios de politicas, creacion de usuarios y direccion IP de origen.

---

## Paso 7: Resolucion de Problemas Frecuentes (Troubleshooting)

### Problema 1: La cabecera muestra "OFFLINE (Reintentar)"
- **Causa:** El backend en el puerto 3000 no se encuentra en ejecucion o el proxy inverso de Vite no puede conectarse.
- **Solucion:**
  1. Haga clic directamente sobre la pildora **OFFLINE (Reintentar)** en la cabecera para forzar una verificacion de conectividad.
  2. En una terminal, inicie el backend: `node backend/server_bridge.js`.
  3. Al detectar el servicio en `http://127.0.0.1:3000/api/health`, el indicador cambiara automaticamente a **AXUM ONLINE** en color verde brillante.

### Problema 2: "Cuenta bloqueada temporalmente por exceso de intentos fallidos"
- **Causa:** Se introdujo una contrasena incorrecta 5 veces consecutivas.
- **Solucion:**
  1. Espere los 15 minutos estipulados por la politica de ciberseguridad para que el bloqueo expire automaticamente.
  2. Alternativamente, solicite a un Super Administrador que acceda a **Seguridad & Modelos** -> **Usuarios** y presione **Desbloquear Cuenta**.

### Problema 3: "Error al inicializar camara: NotReadableError"
- **Causa:** Otra aplicacion en la estacion de trabajo tiene tomada la camara web exclusivamente, o el navegador no recibio permisos de captura de video.
- **Solucion:**
  1. Cierre aplicaciones que utilicen la camara (Zoom, Teams, Skype, etc.).
  2. Verifique en los ajustes de privacidad del navegador que `http://localhost:5173/` tenga concedido el permiso de camara.
  3. Puede continuar operando temporalmente mediante el **Modo Huella** o ingresando la cedula numerica.
