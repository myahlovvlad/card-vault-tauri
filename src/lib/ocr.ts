import type { AppSettings, OcrField, OcrResult } from '../types';

const jobWords = /(директор|менеджер|руководител|engineer|developer|sales|manager|director|ceo|cto|специалист|начальник|founder|owner)/i;

function field(value: string, confidence?: number): OcrField | undefined {
  const clean = value.trim();
  return clean ? { value: clean, confidence } : undefined;
}

export function parseBusinessCardText(rawText: string): OcrResult {
  const text = rawText.replace(/\r/g, '');
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s{2,}/g, ' ') ?? '';
  const website = text.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[\w./?=&%-]*)?/i)?.[0] ?? '';
  const cleaned = lines.filter((line) => !line.includes(email) && !line.includes(phone) && line !== website);
  const jobTitle = cleaned.find((line) => jobWords.test(line)) ?? '';
  const nameCandidate = cleaned.find((line) => {
    const words = line.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 4 && !jobWords.test(line) && line.length < 70;
  }) ?? '';
  const company = cleaned.find((line) => line !== nameCandidate && line !== jobTitle && line.length < 90) ?? '';
  return {
    fullName: field(nameCandidate),
    company: field(company),
    jobTitle: field(jobTitle),
    phone: field(phone),
    email: field(email),
    website: field(website),
    rawText: text.trim(),
    provider: 'local',
  };
}

async function recognizeLocal(
  imageDataUrls: string[],
  language: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<OcrResult> {
  const { createWorker, OEM } = await import('tesseract.js');
  const languages = language.includes('+') ? language.split('+') : language;
  const worker = await createWorker(languages, OEM.LSTM_ONLY, {
    logger: (event) => {
      if (typeof event.progress === 'number') onProgress?.(event.progress, event.status ?? 'OCR');
    },
  });
  try {
    const chunks: string[] = [];
    for (let index = 0; index < imageDataUrls.length; index += 1) {
      onProgress?.(index / Math.max(1, imageDataUrls.length), `Фото ${index + 1}/${imageDataUrls.length}`);
      const result = await worker.recognize(imageDataUrls[index]);
      chunks.push(result.data.text);
    }
    return parseBusinessCardText(chunks.join('\n'));
  } finally {
    await worker.terminate();
  }
}

async function recognizeCloud(imageDataUrls: string[], settings: AppSettings): Promise<OcrResult> {
  if (!settings.allowCloudOcr) throw new Error('Отправка изображений в облачный OCR отключена.');
  if (!/^https:\/\//i.test(settings.cloudOcrEndpoint)) throw new Error('Укажите HTTPS endpoint облачного OCR.');
  const response = await fetch(settings.cloudOcrEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ images: imageDataUrls, language: settings.ocrLanguage }),
  });
  if (!response.ok) throw new Error(`Cloud OCR HTTP ${response.status}`);
  const payload = await response.json() as Partial<OcrResult> & Record<string, unknown>;
  const asField = (value: unknown): OcrField | undefined => {
    if (typeof value === 'string') return field(value);
    if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
      const item = value as { value: string; confidence?: number };
      return field(item.value, item.confidence);
    }
    return undefined;
  };
  return {
    fullName: asField(payload.fullName),
    company: asField(payload.company),
    jobTitle: asField(payload.jobTitle),
    phone: asField(payload.phone),
    email: asField(payload.email),
    website: asField(payload.website),
    address: asField(payload.address),
    rawText: typeof payload.rawText === 'string' ? payload.rawText : '',
    provider: 'cloud',
  };
}

export async function recognizeImages(
  imageDataUrls: string[],
  settings: AppSettings,
  onProgress?: (progress: number, message: string) => void,
): Promise<OcrResult> {
  if (settings.ocrMode === 'local') return recognizeLocal(imageDataUrls, settings.ocrLanguage, onProgress);
  if (settings.ocrMode === 'cloud') return recognizeCloud(imageDataUrls, settings);
  if (settings.allowCloudOcr && settings.cloudOcrEndpoint) {
    try {
      onProgress?.(0.05, 'Онлайн OCR');
      return await recognizeCloud(imageDataUrls, settings);
    } catch (error) {
      console.warn('Cloud OCR unavailable, falling back to local OCR', error);
    }
  }
  return recognizeLocal(imageDataUrls, settings.ocrLanguage, onProgress);
}
