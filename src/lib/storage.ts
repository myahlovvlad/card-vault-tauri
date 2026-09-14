import { get, set } from 'idb-keyval';
import type { AppData, AppDataV1 } from '../types';

const DB_KEY = 'card-vault-data-v1';

export const initialData = (): AppData => ({
  schemaVersion: 2,
  folders: [
    {
      id: 'inbox',
      name: 'Без категории',
      createdAt: new Date().toISOString(),
    },
  ],
  cards: [],
  ownCards: [],
  settings: {
    ocrLanguage: 'rus+eng',
  },
});

function migrate(stored: AppData | AppDataV1 | undefined): AppData {
  if (!stored) return initialData();
  if (stored.schemaVersion === 2) return stored;
  if (stored.schemaVersion === 1) return { ...stored, schemaVersion: 2, ownCards: [] };
  return initialData();
}

export async function loadData(): Promise<AppData> {
  const stored = await get<AppData | AppDataV1>(DB_KEY);
  return migrate(stored);
}

export async function saveData(data: AppData): Promise<void> {
  await set(DB_KEY, data);
}

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = url;
  link.download = `card-vault-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed = JSON.parse(text) as AppData | AppDataV1;
  if ((parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) || !Array.isArray(parsed.cards) || !Array.isArray(parsed.folders)) {
    throw new Error('Файл имеет неподдерживаемый формат CardVault.');
  }
  const migrated = migrate(parsed);
  await saveData(migrated);
  return migrated;
}

export function exportContactsCsv(data: AppData): void {
  const escape = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['Имя', 'Компания', 'Должность', 'Телефон', 'Email', 'Сайт', 'Комментарий', 'Папка', 'Избранное'];
  const folderMap = new Map(data.folders.map((folder) => [folder.id, folder.name]));
  const rows = data.cards.map((card) => [
    card.fullName,
    card.company,
    card.jobTitle,
    card.phone,
    card.email,
    card.website,
    card.comment,
    folderMap.get(card.folderId) ?? '',
    card.starred ? 'Да' : 'Нет',
  ]);
  const csv = '\uFEFF' + [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'card-vault-contacts.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
