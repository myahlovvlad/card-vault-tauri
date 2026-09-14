export type CardPhotoSide = 'front' | 'back' | 'other';

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

export interface AppData {
  schemaVersion: 2;
  folders: Folder[];
  cards: BusinessCard[];
  ownCards: BusinessCard[];
  settings: {
    ocrLanguage: string;
  };
}

export interface AppDataV1 {
  schemaVersion: 1;
  folders: Folder[];
  cards: BusinessCard[];
  settings: {
    ocrLanguage: string;
  };
}

export interface CardDraft {
  folderId: string;
  fullName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  comment: string;
  starred: boolean;
  photos: CardPhoto[];
  ocrText: string;
}
