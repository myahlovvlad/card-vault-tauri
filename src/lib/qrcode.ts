import QRCode from 'qrcode';
import jsQR from 'jsqr';

/** Renders `payload` (a vCard string) as a QR code data URL, sized for on-screen presentation. */
export async function encodeQrDataUrl(payload: string, size = 720): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: { dark: '#231f20', light: '#00000000' },
  });
}

export interface DecodedQr {
  text: string;
}

/** Scans one video frame for a QR code. Returns null when no code is found in that frame. */
export function decodeQrFromVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): DecodedQr | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
  return result ? { text: result.data } : null;
}
