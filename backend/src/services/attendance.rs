use crate::db::repositories::AsistenciaRepository;
use chrono::{Local, NaiveDateTime};
use sqlx::PgPool;

pub struct AttendanceService;

pub enum TransitionResult {
    Cooldown {
        segundos_restantes: i64,
        hora_ultimo_evento: String,
    },
    Proceed {
        tipo_evento: &'static str,
        ultimo_evento_hora: Option<NaiveDateTime>,
    },
}

impl AttendanceService {
    /// Determina la transición de evento de asistencia resolviendo:
    /// 1. Cooldown de anti-passback.
    /// 2. Cambio de día (Day Rollover): Si no hay eventos HOY, siempre inicia en ENTRADA.
    /// 3. Alternancia ENTRADA <-> SALIDA durante el mismo día.
    pub async fn determinar_transicion(
        pool: &PgPool,
        cedula: i32,
        cooldown_segundos: i64,
    ) -> Result<TransitionResult, sqlx::Error> {
        // 1. Obtener el último evento absoluto para verificar Anti-passback
        if let Some(fecha_hora) = AsistenciaRepository::obtener_ultimo_evento_absoluto(pool, cedula).await? {
            let diff = Local::now().naive_local() - fecha_hora;
            let segundos_transcurridos = diff.num_seconds();
            if segundos_transcurridos >= 0 && segundos_transcurridos < cooldown_segundos {
                return Ok(TransitionResult::Cooldown {
                    segundos_restantes: cooldown_segundos - segundos_transcurridos,
                    hora_ultimo_evento: fecha_hora.format("%H:%M:%S").to_string(),
                });
            }
        }

        // 2. Obtener el último evento de HOY para determinar si corresponde ENTRADA o SALIDA
        let (nuevo_evento, ultimo_evento_hora) = match AsistenciaRepository::obtener_ultimo_evento_hoy(pool, cedula).await? {
            None => {
                // Primer evento del día: Siempre es ENTRADA (resuelve el bug de olvido de salida ayer)
                ("ENTRADA", None)
            }
            Some((tipo_str, fecha)) => {
                let tipo = if tipo_str.eq_ignore_ascii_case("ENTRADA") {
                    "SALIDA"
                } else {
                    "ENTRADA"
                };
                (tipo, fecha)
            }
        };

        Ok(TransitionResult::Proceed {
            tipo_evento: nuevo_evento,
            ultimo_evento_hora,
        })
    }

    /// Registra el evento en eventos_lector y actualiza jornada_diaria dentro de una transacción atómica.
    pub async fn registrar_asistencia(
        pool: &PgPool,
        cedula: i32,
        tipo_evento: &str,
        foto_path: Option<&str>,
        metodo_auth: &str,
        hora_previa: Option<NaiveDateTime>,
    ) -> Result<Option<i32>, sqlx::Error> {
        let mut tx = pool.begin().await?;

        // 1. Insertar auditoría de evento
        AsistenciaRepository::insertar_evento(
            &mut tx,
            cedula,
            tipo_evento,
            foto_path,
            metodo_auth,
        )
        .await?;

        // 2. Registrar jornada diaria
        let minutos_calculados = if tipo_evento == "ENTRADA" {
            AsistenciaRepository::registrar_entrada_jornada(&mut tx, cedula, foto_path).await?;
            None
        } else {
            AsistenciaRepository::registrar_salida_jornada(
                &mut tx,
                cedula,
                foto_path,
                hora_previa,
            )
            .await?
        };

        tx.commit().await?;

        Ok(minutos_calculados)
    }
}
