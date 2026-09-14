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

type OwnFields = Pick<CardDraft, 'fullName' | 'company' | 'jobTitle' | 'phone' | 'email' | 'website' | 'comment'>;

const blankFields: OwnFields = { fullName: '', company: '', jobTitle: '', phone: '', email: '', website: '', comment: '' };

export function OwnCardEditor({ open, card, onClose, onSave }: Props) {
  const [fields, setFields] = useState<OwnFields>(blankFields);

  useEffect(() => {
    if (!open) return;
    setFields(card ? { fullName: card.fullName, company: card.company, jobTitle: card.jobTitle, phone: card.phone, email: card.email, website: card.website, comment: card.comment } : blankFields);
  }, [open, card]);

  const update = <K extends keyof OwnFields>(key: K, value: OwnFields[K]) => setFields((current) => ({ ...current, [key]: value }));

  if (!open) return null;

  const previewCard: BusinessCard = {
    id: card?.id ?? 'preview',
    folderId: 'own',
    starred: false,
    photos: [],
    ocrText: '',
    createdAt: card?.createdAt ?? '',
    updatedAt: card?.updatedAt ?? '',
    ...fields,
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={card ? 'Редактирование моей визитки' : 'Новая моя визитка'}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">{card ? 'Редактирование' : 'Новая визитка'}</span>
            <h2>{card ? card.fullName || 'Моя визитка' : 'Создать визитку'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </header>

        <div className="editor-grid own-editor-grid">
          <div className="photo-panel own-preview-panel">
            <span className="own-preview-label">Так увидят вашу визитку</span>
            <WalletCardFace card={previewCard} className="wallet-face-preview" />
          </div>

          <form className="card-form" onSubmit={(event) => { event.preventDefault(); onSave({ ...fields, folderId: 'own', starred: false, photos: [], ocrText: '' }); }}>
            <label>Имя<input required value={fields.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Иван Иванов" /></label>
            <label>Компания<input value={fields.company} onChange={(e) => update('company', e.target.value)} placeholder="ООО Компания" /></label>
            <label>Должность<input value={fields.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="Коммерческий директор" /></label>
            <div className="field-row">
              <label>Телефон<input value={fields.phone} onChange={(e) => update('phone', e.target.value)} inputMode="tel" /></label>
              <label>Email<input value={fields.email} onChange={(e) => update('email', e.target.value)} inputMode="email" /></label>
            </div>
            <label>Сайт<input value={fields.website} onChange={(e) => update('website', e.target.value)} inputMode="url" /></label>
            <label>Комментарий<textarea value={fields.comment} onChange={(e) => update('comment', e.target.value)} rows={3} placeholder="Необязательно" /></label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Отмена</button>
              <button type="submit" className="primary-button"><Save size={17} /> Сохранить</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
