/**
 * Compresión de fotos en el navegador a WebP (< 300 KB) antes de subirlas a R2 (RNF-03).
 * `browser-image-compression` se importa dinámicamente para no romper el render en servidor.
 */

export interface CompressOptions {
  /** Peso máximo en MB (por defecto 0.3 = 300 KB). */
  maxSizeMB?: number;
  /** Lado máximo en px. */
  maxWidthOrHeight?: number;
  /** Calidad inicial (0-1). */
  initialQuality?: number;
}

/** Comprime una imagen de cámara/PC a WebP. */
export async function compressImageToWebp(file: File, options: CompressOptions = {}): Promise<File> {
  const { default: imageCompression } = await import('browser-image-compression');
  return imageCompression(file, {
    maxSizeMB: options.maxSizeMB ?? 0.3,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1600,
    initialQuality: options.initialQuality ?? 0.8,
    fileType: 'image/webp',
    useWebWorker: true,
  });
}

/** Convierte un archivo/imagen a data URL (para previsualizar antes de subir). */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
