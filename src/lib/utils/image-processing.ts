export interface ProcessedImageSet {
  original: File;
  thumbnail: File;
}

interface ResizeImageOptions {
  maxWidth: number;
  maxHeight: number;
  fileName?: string;
  quality?: number;
}

// Fuente decodificada lista para dibujar en canvas.
type DecodedImage = ImageBitmap | HTMLImageElement;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("El navegador no pudo decodificar la imagen"));
    };

    image.src = imageUrl;
  });
}

// Intenta createImageBitmap (más formatos, más rápido) y cae a <img>.
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Algunos navegadores fallan con ciertos formatos: probar vía <img>.
    }
  }
  return loadImageElement(file);
}

function calculateContainSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function canvasToWebP(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo convertir la imagen a WebP"));
          return;
        }

        resolve(new File([blob], fileName, { type: "image/webp" }));
      },
      "image/webp",
      quality,
    );
  });
}

export async function resizeImageToWebP(
  file: File,
  options: ResizeImageOptions,
): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("resizeImageToWebP solo puede ejecutarse en el navegador");
  }

  const image = await decodeImage(file);
  const size = calculateContainSize(
    image.width,
    image.height,
    options.maxWidth,
    options.maxHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar el canvas para procesar la imagen");
  }

  context.drawImage(image, 0, 0, size.width, size.height);

  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    // Liberar memoria del bitmap decodificado una vez dibujado.
    image.close();
  }

  const baseName = (options.fileName || file.name).replace(/\.[^.]+$/, "");

  return canvasToWebP(canvas, `${baseName}.webp`, options.quality ?? 0.9);
}

export async function generateProductImageSet(
  file: File,
): Promise<ProcessedImageSet> {
  const original = await resizeImageToWebP(file, {
    maxWidth: 800,
    maxHeight: 800,
    fileName: file.name,
    quality: 0.9,
  });

  const thumbnail = await resizeImageToWebP(file, {
    maxWidth: 200,
    maxHeight: 200,
    fileName: file.name.replace(/\.[^.]+$/, "-thumb"),
    quality: 0.82,
  });

  return {
    original,
    thumbnail,
  };
}
