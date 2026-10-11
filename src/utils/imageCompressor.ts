/**
 * Comprime y redimensiona una imagen en el navegador del cliente antes de subirla
 * @param file Archivo de imagen original seleccionado por el usuario
 * @param maxWidth Ancho máximo permitido en píxeles (por defecto 1200)
 * @param quality Calidad de compresión JPEG entre 0 y 1 (por defecto 0.75)
 */
export const compressImage = (
  file: File,
  maxWidth = 1200,
  quality = 0.75
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Escalar manteniendo proporción si excede el ancho máximo
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el lienzo para compresión'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al comprimir la imagen'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};