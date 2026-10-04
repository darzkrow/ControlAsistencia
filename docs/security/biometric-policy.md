# Políticas de Seguridad, Ciberseguridad y Manejo de Datos Biométricos

## 1. Contexto Legal y Regulatorio
Los datos biométricos (patrones faciales, minucias de huellas dactilares) están clasificados como **datos de categoría especial / sensibles** bajo normativas internacionales (RGPD en Europa, LGPD en Brasil, leyes de protección de datos personales en Latinoamérica).
Su recolección y tratamiento exige medidas de seguridad reforzadas y consentimiento explícito.

---

## 2. Matriz de Vulnerabilidades Actuales y Mitigaciones

| Vector de Amenaza | Riesgo Actual en el Proyecto | Mitigación Requerida |
| :--- | :--- | :--- |
| **Spoofing / Suplantación** | Alta: El detector Haar Cascade valida cualquier foto en papel o pantalla de celular. | Implementar detección de vida (*Liveness Detection*) o desafío interactivo (parpadeo, inclinación de cabeza). |
| **Falsificación de Identidad** | Crítica: El sistema no compara el rostro con la foto del empleado, solo comprueba que haya "un rostro". | Implementar comparación 1:1 de embeddings faciales contra el vector del empleado (`foto_referencial`). |
| **Fuga de Datos Biométricos** | Alta: Las fotos se guardan en claro en la carpeta `uploads/fotos/*.jpg`. | Cifrar las imágenes en reposo (AES-256) o idealmente almacenar únicamente templates vectoriales irreversibles. |
| **Inyección de Eventos no Autorizados** | Alta: El endpoint `/api/escaneo` es público, sin autenticación ni token de terminal. | Autenticar cada lector con clave de API rotativa o certificado de dispositivo (mTLS). |
| **Ataque DoS por Payload Masivo** | Media: No hay límite en el tamaño del JSON ni del Base64 decodificado. | Configurar `DefaultBodyLimit::max(5 * 1024 * 1024)` en Axum y rate limiting con `tower-governor`. |
| **Espionaje en Tránsito (Man-in-the-Middle)** | Alta: Tráfico HTTP en texto plano; CORS abierto a `Any`. | Exigir HTTPS/TLS obligatorio; restringir `Access-Control-Allow-Origin` al dominio del kiosko. |

---

## 3. Política de Retención y Anonimización de Evidencias
1. **Minimización de Datos:** Si el propósito es registrar la asistencia, no es necesario retener la foto perpetuamente.
2. **Ciclo de Vida:**
   - Mantener las imágenes de evidencia de marcaje durante un máximo de **30 a 90 días** para resolución de disputas laborales.
   - Pasado el plazo, un cron job o tarea en segundo plano debe purgar las imágenes físicas y mantener únicamente el timestamp y la metadata del evento en la base de datos.
3. **Control de Acceso a las Fotografías:**
   - La carpeta `uploads/fotos` no debe ser servida de manera pública por un servidor web estático sin autenticación basada en roles (RBAC).

---

## 4. Checklist para Despliegue en Producción
- [ ] TLS 1.3 activado en proxy inverso (Nginx / Caddy / Traefik).
- [ ] Variables de entorno protegidas (no usar `.env` con contraseñas por defecto).
- [ ] Base de datos PostgreSQL con usuario de mínimos privilegios (sin superusuario `postgres` ni `admin` genérico).
- [ ] Cifrado de disco o volumen donde residan las fotos temporales.
- [ ] Firma de consentimiento de recolección de datos biométricos por parte de los trabajadores.
