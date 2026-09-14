export interface ParsedOcr {
  fullName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  rawText: string;
}

const jobWords = /(директор|менеджер|руководител|engineer|developer|sales|manager|director|ceo|cto|специалист|начальник|founder|owner)/i;

export function parseBusinessCardText(rawText: string): ParsedOcr {
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

  return { fullName: nameCandidate, company, jobTitle, phone, email, website, rawText: text.trim() };
}

export async function recognizeImages(
  imageDataUrls: string[],
  language = 'rus+eng',
  onProgress?: (progress: number, message: string) => void,
): Promise<ParsedOcr> {
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
