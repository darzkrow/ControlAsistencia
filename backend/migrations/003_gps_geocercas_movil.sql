-- ==============================================================================
-- MIGRACION 003: Geolocalizacion GPS, Geocercas y Asistencia Movil / Tablet
-- ==============================================================================

-- 1. Coordenadas y Radio de Tolerancia para Geocercas en Sedes
ALTER TABLE public.sedes 
ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 7) DEFAULT 10.4910000,
ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7) DEFAULT -66.8780000,
ADD COLUMN IF NOT EXISTS radio_tolerancia_metros INTEGER DEFAULT 150;

-- Coordenadas de prueba para Sedes existentes
UPDATE public.sedes 
SET latitud = 10.4910000, longitud = -66.8780000, radio_tolerancia_metros = 150
WHERE codigo = 'SEDE-CENTRAL';

UPDATE public.sedes 
SET latitud = 10.2230000, longitud = -67.9860000, radio_tolerancia_metros = 200
WHERE codigo = 'SEDE-NORTE';

-- 2. Registro de Auditoria GPS y Deteccion de Fraude en Eventos Lector
ALTER TABLE public.eventos_lector
ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS precision_gps NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS fuera_de_sede BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS distancia_metros INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sede_id INTEGER REFERENCES public.sedes(id),
ADD COLUMN IF NOT EXISTS origen_dispositivo VARCHAR(50) DEFAULT 'KIOSKO',
ADD COLUMN IF NOT EXISTS alerta_fraude_rrhh BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estado_auditoria_rrhh VARCHAR(30) DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS notas_auditoria TEXT;

-- 3. Auditoria de Ubicacion en Jornada Diaria
ALTER TABLE public.jornada_diaria
ADD COLUMN IF NOT EXISTS fuera_de_sede_entrada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS distancia_sede_entrada INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS latitud_entrada NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitud_entrada NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS fuera_de_sede_salida BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS distancia_sede_salida INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS latitud_salida NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitud_salida NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS alerta_fraude_rrhh BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispositivo_movil_info VARCHAR(150);

-- Indice para acelerar consultas de auditoria de fraude por RRHH
CREATE INDEX IF NOT EXISTS idx_eventos_lector_alerta_fraude 
ON public.eventos_lector(alerta_fraude_rrhh, fuera_de_sede);

CREATE INDEX IF NOT EXISTS idx_jornada_diaria_alerta_fraude 
ON public.jornada_diaria(alerta_fraude_rrhh);
