import { get, set } from 'idb-keyval';
import type { AppData, AppDataV1, AppDataV2, BusinessCard } from '../types';

const DB_KEY = 'card-vault-data-v1';

export const initialData = (): AppData => ({
  schemaVersion: 3,
  folders: [{ id: 'inbox', name: 'Без категории', createdAt: new Date().toISOString() }],
  cards: [],
  ownCards: [],
  settings: {
    ocrLanguage: 'rus+eng',
    ocrMode: 'auto',
    cloudOcrEndpoint: '',
    allowCloudOcr: false,
  },
});

function upgradeCard(card: Partial<BusinessCard>): BusinessCard {
  const now = new Date().toISOString();
  return {
    id: card.id ?? crypto.randomUUID(),
    folderId: card.folderId ?? 'inbox',
    fullName: card.fullName ?? '',
    company: card.company ?? '',
    jobTitle: card.jobTitle ?? '',
    phone: card.phone ?? '',
    email: card.email ?? '',
    website: card.website ?? '',
    address: card.address ?? '',
    tags: Array.isArray(card.tags) ? card.tags : [],
    comment: card.comment ?? '',
    starred: Boolean(card.starred),
    photos: Array.isArray(card.photos) ? card.photos : [],
    ocrText: card.ocrText ?? '',
    createdAt: card.createdAt ?? now,
    updatedAt: card.updatedAt ?? now,
  };
}

function migrate(stored: AppData | AppDataV2 | AppDataV1 | undefined): AppData {
  if (!stored) return initialData();
  if (stored.schemaVersion === 3) {
    return {
      ...stored,
      cards: stored.cards.map(upgradeCard),
      ownCards: stored.ownCards.map(upgradeCard),
      settings: { ...initialData().settings, ...stored.settings },
    };
  }
  if (stored.schemaVersion === 2) {
    return {
      schemaVersion: 3,
      folders: stored.folders,
      cards: stored.cards.map(upgradeCard),
      ownCards: stored.ownCards.map(upgradeCard),
      settings: { ...initialData().settings, ...stored.settings },
    };
  }
  return {
    schemaVersion: 3,
    folders: stored.folders,
    cards: stored.cards.map(upgradeCard),
    ownCards: [],
    settings: { ...initialData().settings, ...stored.settings },
  };
}

export async function loadData(): Promise<AppData> {
  return migrate(await get<AppData | AppDataV2 | AppDataV1>(DB_KEY));
}

export async function saveData(data: AppData): Promise<void> {
  await set(DB_KEY, data);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportData(data: AppData): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }),
    `card-vault-${stamp}.json`,
  );
}

export async function importData(file: File): Promise<AppData> {
  const parsed = JSON.parse(await file.text()) as AppData | AppDataV2 | AppDataV1;
  if (![1, 2, 3].includes(parsed.schemaVersion) || !Array.isArray(parsed.cards) || !Array.isArray(parsed.folders)) {
    throw new Error('Файл имеет неподдерживаемый формат CardVault.');
  }
  const migrated = migrate(parsed);
  await saveData(migrated);
  return migrated;
}

export function exportContactsCsv(data: AppData): void {
  const escape = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const folderMap = new Map(data.folders.map((folder) => [folder.id, folder.name]));
  const header = ['Имя', 'Компания', 'Должность', 'Телефон', 'Email', 'Сайт', 'Адрес', 'Теги', 'Комментарий', 'Папка', 'Избранное'];
  const rows = data.cards.map((card) => [
    card.fullName, card.company, card.jobTitle, card.phone, card.email, card.website, card.address,
    card.tags.join(', '), card.comment, folderMap.get(card.folderId) ?? '', card.starred ? 'Да' : 'Нет',
  ]);
  const csv = '\uFEFF' + [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'card-vault-contacts.csv');
}

export function findDuplicate(data: AppData, draft: Pick<BusinessCard, 'phone' | 'email' | 'fullName' | 'company'>, ignoreId?: string): BusinessCard | undefined {
  const normPhone = (value: string) => value.replace(/\D/g, '');
  const norm = (value: string) => value.trim().toLocaleLowerCase('ru');
  return data.cards.find((card) => {
    if (card.id === ignoreId) return false;
    if (draft.email && card.email && norm(draft.email) === norm(card.email)) return true;
    if (normPhone(draft.phone).length >= 7 && normPhone(draft.phone) === normPhone(card.phone)) return true;
    return Boolean(draft.fullName && draft.company && norm(draft.fullName) === norm(card.fullName) && norm(draft.company) === norm(card.company));
  });
}
