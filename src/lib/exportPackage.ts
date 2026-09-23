import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type { AppData, BusinessCard } from '../types';

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(value: string): string {
  return (value || 'contact').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);
}

function photoExtension(dataUrl: string): string {
  const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,/.exec(dataUrl);
  const ext = match?.[1]?.toLowerCase();
  if (!ext) return 'jpg';
  return ext === 'jpeg' ? 'jpg' : ext.replace('+xml', '');
}

function photoPath(card: BusinessCard, side: 'front' | 'back'): string {
  const photo = card.photos.find((item) => item.side === side);
  if (!photo) return '';
  const index = card.photos.indexOf(photo) + 1;
  return `photos/${safeName(card.fullName)}_${card.id.slice(0, 8)}/${side}_${String(index).padStart(2, '0')}.${photoExtension(photo.dataUrl)}`;
}

function workbookFor(data: AppData): XLSX.WorkBook {
  const folderMap = new Map(data.folders.map((folder) => [folder.id, folder.name]));
  const rows = data.cards.map((card) => ({
    ID: card.id,
    Имя: card.fullName,
    Компания: card.company,
    Должность: card.jobTitle,
    Телефон: card.phone,
    Email: card.email,
    Сайт: card.website,
    Адрес: card.address,
    Теги: card.tags.join(', '),
    Комментарий: card.comment,
    Папка: folderMap.get(card.folderId) ?? '',
    Избранное: card.starred ? 'Да' : 'Нет',
    Создано: card.createdAt,
    Изменено: card.updatedAt,
    'Фото (лицевая)': photoPath(card, 'front'),
    'Фото (оборотная)': photoPath(card, 'back'),
  }));

  const folders = data.folders.map((folder) => ({
    ID: folder.id,
    Название: folder.name,
    Контактов: data.cards.filter((card) => card.folderId === folder.id).length,
  }));

  const metadata = [
    { Параметр: 'CardVault version', Значение: '0.2.0' },
    { Параметр: 'Schema version', Значение: data.schemaVersion },
    { Параметр: 'Export date', Значение: new Date().toISOString() },
    { Параметр: 'Contacts', Значение: data.cards.length },
    { Параметр: 'Photos', Значение: data.cards.reduce((sum, card) => sum + card.photos.length, 0) },
  ];

  const wb = XLSX.utils.book_new();
  const contacts = XLSX.utils.json_to_sheet(rows);
  contacts['!cols'] = Array.from({ length: 16 }, () => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, contacts, 'Contacts');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(folders), 'Folders');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metadata), 'Metadata');
  return wb;
}

export function exportContactsXlsx(data: AppData): void {
  const bytes = XLSX.write(workbookFor(data), { type: 'array', bookType: 'xlsx' });
  saveBlob(
    new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'card-vault-contacts.xlsx',
  );
}

export async function exportArchive(data: AppData): Promise<void> {
  const zip = new JSZip();
  zip.file('contacts.xlsx', XLSX.write(workbookFor(data), { type: 'array', bookType: 'xlsx' }));
  zip.file('manifest.json', JSON.stringify({
    app: 'CardVault',
    version: '0.2.0',
    schemaVersion: data.schemaVersion,
    exportedAt: new Date().toISOString(),
    contacts: data.cards.length,
    photos: data.cards.reduce((sum, card) => sum + card.photos.length, 0),
  }, null, 2));

  for (const card of data.cards) {
    const folder = zip.folder(`photos/${safeName(card.fullName)}_${card.id.slice(0, 8)}`);
    card.photos.forEach((photo, index) => {
      folder?.file(
        `${photo.side}_${String(index + 1).padStart(2, '0')}.${photoExtension(photo.dataUrl)}`,
        photo.dataUrl.split(',')[1] ?? '',
        { base64: true },
      );
    });
  }

  saveBlob(
    await zip.generateAsync({ type: 'blob' }),
    `CardVault_${new Date().toISOString().slice(0, 10)}.zip`,
  );
}
