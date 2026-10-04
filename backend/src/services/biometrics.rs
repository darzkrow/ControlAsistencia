use base64::{engine::general_purpose::STANDARD, Engine as _};
use opencv::{
    core::{Mat, Scalar, Vector},
    imgcodecs, imgproc,
    objdetect::CascadeClassifier,
    prelude::*,
};

pub struct BiometricService;

impl BiometricService {
    /// Procesa una imagen Base64: decodifica, convierte a escala de grises, ecualiza histograma,
    /// detecta rostros con Haar Cascade, dibuja bounding box y guarda la evidencia en disco.
    pub fn procesar_rostro(b64_img: &str) -> Result<(String, String), String> {
        let b64_data = b64_img.split(',').nth(1).unwrap_or(b64_img);

        let img_bytes = STANDARD
            .decode(b64_data)
            .map_err(|_| "Error decodificando la imagen Base64")?;

        let vector = Vector::from_slice(&img_bytes);
        let mut img_mat = imgcodecs::imdecode(&vector, imgcodecs::IMREAD_COLOR)
            .map_err(|_| "Error cargando la matriz de imagen en memoria")?;

        let mut gray = Mat::default();
        imgproc::cvt_color(&img_mat, &mut gray, imgproc::COLOR_BGR2GRAY, 0)
            .map_err(|_| "Error aplicando filtro de escala de grises")?;

        let mut gray_eq = Mat::default();
        imgproc::equalize_hist(&gray, &mut gray_eq)
            .map_err(|_| "Error ecualizando histograma de la imagen")?;

        let mut face_cascade = CascadeClassifier::new("assets/haarcascade_frontalface_default.xml")
            .map_err(|_| "Error cargando el modelo Haar Cascade")?;
        let mut faces = Vector::<opencv::core::Rect>::new();

        face_cascade
            .detect_multi_scale(
                &gray_eq,
                &mut faces,
                1.1,
                2,
                0,
                opencv::core::Size::new(30, 30),
                opencv::core::Size::default(),
            )
            .map_err(|_| "Error ejecutando la detección facial")?;

        if faces.is_empty() {
            return Err("Operación rechazada: No se detectó ningún rostro en la cámara.".to_string());
        }

        // Dibujar recuadro verde neón (BGR: 0, 255, 0) sobre los rostros detectados
        for face in faces.iter() {
            imgproc::rectangle(
                &mut img_mat,
                face,
                Scalar::new(0.0, 255.0, 0.0, 0.0),
                3,
                imgproc::LINE_8,
                0,
            )
            .map_err(|_| "Error al dibujar el recuadro de detección")?;
        }

        // Guardar archivo físico en uploads/fotos
        let nombre_archivo = format!("uploads/fotos/{}.jpg", uuid::Uuid::new_v4());
        imgcodecs::imwrite(&nombre_archivo, &img_mat, &Vector::new())
            .map_err(|_| "Error guardando el archivo físico en el servidor")?;

        // Codificar la imagen procesada a Base64 para visualización en el Kiosko
        let mut buf = Vector::<u8>::new();
        imgcodecs::imencode(".jpg", &img_mat, &mut buf, &Vector::new())
            .map_err(|_| "Error codificando imagen procesada a Base64")?;
        let b64_procesada = STANDARD.encode(buf.as_slice());

        Ok((nombre_archivo, b64_procesada))
    }
}
