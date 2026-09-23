import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import type { BusinessCard, CardDraft } from '../types';
import { WalletCardFace } from './WalletCardFace';

interface Props {
  open: boolean;
  card?: BusinessCard | null;
  onClose: () => void;
  onSave: (draft: CardDraft) => void;
}

type OwnFields = Pick<CardDraft, 'fullName' | 'company' | 'jobTitle' | 'phone' | 'email' | 'website' | 'address' | 'comment'>;

const blankFields: OwnFields = {
  fullName: '', company: '', jobTitle: '', phone: '', email: '', website: '', address: '', comment: '',
};

export function OwnCardEditor({ open, card, onClose, onSave }: Props) {
  const [fields, setFields] = useState<OwnFields>(blankFields);

  useEffect(() => {
    if (!open) return;
    setFields(card ? {
      fullName: card.fullName,
      company: card.company,
      jobTitle: card.jobTitle,
      phone: card.phone,
      email: card.email,
      website: card.website,
      address: card.address,
      comment: card.comment,
    } : blankFields);
  }, [open, card]);

  const update = <K extends keyof OwnFields>(key: K, value: OwnFields[K]) =>
    setFields((currentFields) => ({ ...currentFields, [key]: value }));

  if (!open) return null;

  const previewCard: BusinessCard = {
    id: card?.id ?? 'preview',
    folderId: 'own',
    starred: false,
    photos: [],
    ocrText: '',
    tags: [],
    createdAt: card?.createdAt ?? '',
    updatedAt: card?.updatedAt ?? '',
    ...fields,
  };

  return (
    <div className="editor-screen">
      <header className="editor-topbar">
        <button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <div><h2>{card ? 'Изменить мою визитку' : 'Новая визитка'}</h2></div>
        <button className="primary-button" onClick={() => onSave({
          ...fields,
          folderId: 'own',
          starred: false,
          photos: [],
          tags: [],
          ocrText: '',
        })}><Save size={17} />Сохранить</button>
      </header>
      <div className="editor-page own-editor-page">
        <aside className="own-preview-panel">
          <p>Предпросмотр</p>
          <WalletCardFace card={previewCard} className="wallet-face-preview" />
        </aside>
        <form className="card-form" onSubmit={(event) => {
          event.preventDefault();
          onSave({ ...fields, folderId: 'own', starred: false, photos: [], tags: [], ocrText: '' });
        }}>
          <h3>Контактные данные</h3>
          <label>Имя<input required value={fields.fullName} onChange={(e) => update('fullName', e.target.value)} /></label>
          <label>Компания<input value={fields.company} onChange={(e) => update('company', e.target.value)} /></label>
          <label>Должность<input value={fields.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} /></label>
          <div className="field-row">
            <label>Телефон<input value={fields.phone} onChange={(e) => update('phone', e.target.value)} inputMode="tel" /></label>
            <label>Email<input value={fields.email} onChange={(e) => update('email', e.target.value)} inputMode="email" /></label>
          </div>
          <label>Сайт<input value={fields.website} onChange={(e) => update('website', e.target.value)} inputMode="url" /></label>
          <label>Адрес<input value={fields.address} onChange={(e) => update('address', e.target.value)} /></label>
          <label>Комментарий<textarea value={fields.comment} onChange={(e) => update('comment', e.target.value)} rows={3} /></label>
        </form>
      </div>
    </div>
  );
}
