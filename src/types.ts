export type CardPhotoSide = 'front' | 'back' | 'other';
export type OcrMode = 'auto' | 'local' | 'cloud';

export interface CardPhoto {
  id: string;
  dataUrl: string;
  fileName: string;
  side: CardPhotoSide;
}

export interface BusinessCard {
  id: string;
  folderId: string;
  fullName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  tags: string[];
  comment: string;
  starred: boolean;
  photos: CardPhoto[];
  ocrText: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface AppSettings {
  ocrLanguage: string;
  ocrMode: OcrMode;
  cloudOcrEndpoint: string;
  allowCloudOcr: boolean;
}

export interface AppData {
  schemaVersion: 3;
  folders: Folder[];
  cards: BusinessCard[];
  ownCards: BusinessCard[];
  settings: AppSettings;
}

export interface AppDataV1 {
  schemaVersion: 1;
  folders: Folder[];
  cards: Omit<BusinessCard, 'address' | 'tags'>[];
  settings: { ocrLanguage: string };
}

export interface AppDataV2 {
  schemaVersion: 2;
  folders: Folder[];
  cards: Omit<BusinessCard, 'address' | 'tags'>[];
  ownCards: Omit<BusinessCard, 'address' | 'tags'>[];
  settings: { ocrLanguage: string };
}

export interface CardDraft {
  folderId: string;
  fullName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  tags: string[];
  comment: string;
  starred: boolean;
  photos: CardPhoto[];
  ocrText: string;
}

export interface OcrField {
  value: string;
  confidence?: number;
}

export interface OcrResult {
  fullName?: OcrField;
  company?: OcrField;
  jobTitle?: OcrField;
  phone?: OcrField;
  email?: OcrField;
  website?: OcrField;
  address?: OcrField;
  rawText: string;
  provider: 'local' | 'cloud';
}
