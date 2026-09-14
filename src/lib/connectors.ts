import type { AppData, BusinessCard, CardDraft } from '../types';

export interface ConnectorResult {
  ok: boolean;
  message: string;
}

export interface ContactConnector {
  id: string;
  name: string;
  sync(data: AppData): Promise<ConnectorResult>;
}

/**
 * Extension point for CRM integrations (Bitrix24, amoCRM, HubSpot, custom REST).
 * The MVP deliberately does not ship credentials or vendor-specific OAuth flows.
 */
export class PlaceholderCrmConnector implements ContactConnector {
  id = 'crm-placeholder';
  name = 'CRM connector';
  async sync(): Promise<ConnectorResult> {
    return { ok: false, message: 'CRM-коннектор не настроен. Добавьте OAuth/API адаптер в src/lib/connectors.ts.' };
  }
}

function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/[,;]/g, (char) => `\\${char}`).replace(/\n/g, '\\n');
}

export function createVCard(card: BusinessCard): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCardValue(card.fullName)}`];
  if (card.company) lines.push(`ORG:${escapeVCardValue(card.company)}`);
  if (card.jobTitle) lines.push(`TITLE:${escapeVCardValue(card.jobTitle)}`);
  if (card.phone) lines.push(`TEL:${escapeVCardValue(card.phone)}`);
  if (card.email) lines.push(`EMAIL:${escapeVCardValue(card.email)}`);
  if (card.website) lines.push(`URL:${escapeVCardValue(card.website)}`);
  if (card.comment) lines.push(`NOTE:${escapeVCardValue(card.comment)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function isVCard(text: string): boolean {
  return /BEGIN:VCARD/i.test(text);
}

/** Parses a vCard 2.1/3.0 payload (e.g. decoded from a scanned QR code) into a card draft for user confirmation. */
export function parseVCard(text: string, folderId: string): CardDraft {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const lines = unfolded.split('\n').map((line) => line.trim()).filter(Boolean);
  const draft: CardDraft = {
    folderId,
    fullName: '',
    company: '',
    jobTitle: '',
    phone: '',
    email: '',
    website: '',
    comment: '',
    starred: false,
    photos: [],
    ocrText: text,
  };

  const unescape = (value: string) => value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');

  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const rawKey = line.slice(0, separatorIndex);
    const value = unescape(line.slice(separatorIndex + 1));
    const key = rawKey.split(';')[0].toUpperCase();
    switch (key) {
      case 'FN':
        draft.fullName = value;
        break;
      case 'N':
        if (!draft.fullName) draft.fullName = value.split(';').filter(Boolean).reverse().join(' ');
        break;
      case 'ORG':
        draft.company = value.split(';')[0];
        break;
      case 'TITLE':
        draft.jobTitle = value;
        break;
      case 'TEL':
        if (!draft.phone) draft.phone = value;
        break;
      case 'EMAIL':
        if (!draft.email) draft.email = value;
        break;
      case 'URL':
        if (!draft.website) draft.website = value;
        break;
      case 'NOTE':
        draft.comment = value;
        break;
      default:
        break;
    }
  }

  return draft;
}

export function downloadVCard(card: BusinessCard): void {
  const blob = new Blob([createVCard(card)], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.fullName || 'contact'}.vcf`.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
