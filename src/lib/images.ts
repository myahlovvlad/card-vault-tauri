import type { CardPhoto, CardPhotoSide } from '../types';

const MAX_EDGE = 1800;
const JPEG_QUALITY = 0.84;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
    image.src = dataUrl;
  });
}

export async function compressImage(file: File, side: CardPhotoSide = 'other'): Promise<CardPhoto> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступен.');
  ctx.drawImage(image, 0, 0, width, height);

  return {
    id: crypto.randomUUID(),
    dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
    fileName: file.name,
    side,
  };
}
