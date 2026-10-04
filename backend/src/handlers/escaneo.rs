use crate::db::repositories::EmpleadoRepository;
use crate::models::{EscaneoRequest, EscaneoResponse};
use crate::services::{attendance::TransitionResult, AttendanceService, BiometricService};
use crate::state::AppState;
use axum::{extract::State, Json};
use chrono::Local;

pub async fn escaneo_handler(
    State(state): State<AppState>,
    Json(payload): Json<EscaneoRequest>,
) -> Json<EscaneoResponse> {
    // 1. Validar existencia del colaborador a través de la capa ORM (EmpleadoRepository)
    let empleado = match EmpleadoRepository::buscar_por_cedula(&state.pool, payload.cedula).await {
        Ok(Some(emp)) => emp,
        Ok(None) => {
            return Json(EscaneoResponse {
                es_empleado: false,
                mensaje: "Bienvenido a Rapture. Por favor diríjase a la recepción para registrar su visita.".to_string(),
                nombre_completo: None,
                departamento: None,
                tipo_evento: "visitante".to_string(),
                foto_detectada_b64: None,
                minutos_acumulados: None,
                hora_evento: None,
            });
        }
        Err(e) => {
            eprintln!("Error al consultar colaborador en base de datos: {:?}", e);
            return Json(EscaneoResponse {
                es_empleado: false,
                mensaje: "Error interno del servidor al consultar colaborador.".to_string(),
                nombre_completo: None,
                departamento: None,
                tipo_evento: "error".to_string(),
                foto_detectada_b64: None,
                minutos_acumulados: None,
                hora_evento: None,
            });
        }
    };

    // 2. Determinar la transición lógica de asistencia (Anti-passback + Day Rollover)
    let (nuevo_evento, hora_previa) = match AttendanceService::determinar_transicion(
        &state.pool,
        empleado.cedula,
        state.config.cooldown_seconds,
    )
    .await
    {
        Ok(TransitionResult::Cooldown {
            segundos_restantes,
            hora_ultimo_evento,
        }) => {
            return Json(EscaneoResponse {
                es_empleado: true,
                mensaje: format!(
                    "Marcación reciente detectada (espere {}s para registrar el siguiente evento).",
                    segundos_restantes
                ),
                nombre_completo: Some(empleado.nombre_completo),
                departamento: Some(empleado.departamento),
                tipo_evento: "cooldown".to_string(),
                foto_detectada_b64: None,
                minutos_acumulados: None,
                hora_evento: Some(hora_ultimo_evento),
            });
        }
        Ok(TransitionResult::Proceed {
            tipo_evento,
            ultimo_evento_hora,
        }) => (tipo_evento, ultimo_evento_hora),
        Err(e) => {
            eprintln!("Error evaluando transición de jornada: {:?}", e);
            return Json(EscaneoResponse {
                es_empleado: false,
                mensaje: "Error interno al verificar historial de asistencia.".to_string(),
                nombre_completo: Some(empleado.nombre_completo),
                departamento: None,
                tipo_evento: "error".to_string(),
                foto_detectada_b64: None,
                minutos_acumulados: None,
                hora_evento: None,
            });
        }
    };

    let mut foto_path = None;
    let mut foto_resultado_b64 = None;
    let metodo_auth = payload.metodo.as_deref().unwrap_or("facial");

    // 3. Validación Biométrica
    if let Some(b64) = payload.foto_b64 {
        let b64_clone = b64.clone();
        // Aislamiento de CPU intensa en worker pool dedicado
        let validacion = tokio::task::spawn_blocking(move || {
            BiometricService::procesar_rostro(&b64_clone)
        })
        .await;

        match validacion {
            Ok(Ok((ruta, b64_procesada))) => {
                foto_path = Some(ruta);
                foto_resultado_b64 = Some(b64_procesada);
            }
            Ok(Err(msj_error)) => {
                return Json(EscaneoResponse {
                    es_empleado: false,
                    mensaje: msj_error,
                    nombre_completo: Some(empleado.nombre_completo),
                    departamento: None,
                    tipo_evento: "rechazado".to_string(),
                    foto_detectada_b64: None,
                    minutos_acumulados: None,
                    hora_evento: None,
                });
            }
            Err(_) => {
                return Json(EscaneoResponse {
                    es_empleado: false,
                    mensaje: "Error de ejecución en el worker biométrico.".to_string(),
                    nombre_completo: Some(empleado.nombre_completo),
                    departamento: None,
                    tipo_evento: "error".to_string(),
                    foto_detectada_b64: None,
                    minutos_acumulados: None,
                    hora_evento: None,
                });
            }
        }
    } else if metodo_auth != "huella" && payload.huella_b64.is_none() {
        return Json(EscaneoResponse {
            es_empleado: false,
            mensaje: "Operación rechazada: Se requiere captura biométrica (cámara o sensor dactilar).".to_string(),
            nombre_completo: Some(empleado.nombre_completo),
            departamento: None,
            tipo_evento: "rechazado".to_string(),
            foto_detectada_b64: None,
            minutos_acumulados: None,
            hora_evento: None,
        });
    }

    // 4. Registro Transaccional a través del Servicio de Asistencia
    let minutos_calculados = match AttendanceService::registrar_asistencia(
        &state.pool,
        empleado.cedula,
        nuevo_evento,
        foto_path.as_deref(),
        metodo_auth,
        hora_previa,
    )
    .await
    {
        Ok(min) => min,
        Err(e) => {
            eprintln!("Error al registrar asistencia en base de datos: {:?}", e);
            return Json(EscaneoResponse {
                es_empleado: false,
                mensaje: "Error al consolidar la marcación en la base de datos.".to_string(),
                nombre_completo: None,
                departamento: None,
                tipo_evento: "error".to_string(),
                foto_detectada_b64: None,
                minutos_acumulados: None,
                hora_evento: None,
            });
        }
    };

    let ahora = Local::now().format("%H:%M:%S").to_string();
    let mensaje = match nuevo_evento {
        "ENTRADA" => format!(
            "¡Bienvenido/a, {}! Entrada registrada exitosamente.",
            empleado.nombre_completo
        ),
        _ => format!(
            "¡Hasta luego, {}! Salida registrada exitosamente.",
            empleado.nombre_completo
        ),
    };

    Json(EscaneoResponse {
        es_empleado: true,
        mensaje,
        nombre_completo: Some(empleado.nombre_completo),
        departamento: Some(empleado.departamento),
        tipo_evento: nuevo_evento.to_lowercase(),
        foto_detectada_b64: foto_resultado_b64,
        minutos_acumulados: minutos_calculados,
        hora_evento: Some(ahora),
    })
}
