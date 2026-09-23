import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, FileImage, LoaderCircle, Save, Trash2, X } from 'lucide-react';
import type { AppSettings, BusinessCard, CardDraft, CardPhoto, CardPhotoSide, Folder, OcrResult } from '../types';
import { compressImage } from '../lib/images';
import { recognizeImages } from '../lib/ocr';

interface Props {
  open: boolean;
  folders: Folder[];
  card?: BusinessCard | null;
  initialDraft?: CardDraft | null;
  initialFolderId?: string;
  settings: AppSettings;
  onClose: () => void;
  onSave: (draft: CardDraft) => void;
}

const blankDraft = (folderId: string): CardDraft => ({
  folderId,
  fullName: '',
  company: '',
  jobTitle: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  tags: [],
  comment: '',
  starred: false,
  photos: [],
  ocrText: '',
});

function confidenceClass(value?: number): string {
  if (value == null) return '';
  return value >= 0.85 ? 'confidence-good' : 'confidence-check';
}

export function CardEditor({ open, folders, card, initialDraft, initialFolderId, settings, onClose, onSave }: Props) {
  const fallbackFolder = initialFolderId || folders[0]?.id || 'inbox';
  const [draft, setDraft] = useState<CardDraft>(blankDraft(fallbackFolder));
  const [busy, setBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (card) {
      setDraft({
        folderId: card.folderId,
        fullName: card.fullName,
        company: card.company,
        jobTitle: card.jobTitle,
        phone: card.phone,
        email: card.email,
        website: card.website,
        address: card.address,
        tags: card.tags,
        comment: card.comment,
        starred: card.starred,
        photos: card.photos,
        ocrText: card.ocrText,
      });
    } else if (initialDraft) {
      setDraft({ ...initialDraft, folderId: initialDraft.folderId || fallbackFolder });
    } else {
      setDraft(blankDraft(fallbackFolder));
    }
    setOcrStatus('');
    setOcrResult(null);
  }, [open, card, initialDraft, fallbackFolder]);

  const canRunOcr = useMemo(() => draft.photos.length > 0 && !busy, [draft.photos.length, busy]);
  const update = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) =>
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const newPhotos: CardPhoto[] = [];
      for (let i = 0; i < files.length; i += 1) newPhotos.push(await compressImage(files[i]));
      const photos = [...draft.photos, ...newPhotos];
      setDraft((currentDraft) => ({ ...currentDraft, photos }));
      await runOcr(photos);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function runOcr(photos = draft.photos) {
    if (!photos.length) return;
    setBusy(true);
    setOcrStatus('Распознавание…');
    try {
      const parsed = await recognizeImages(
        photos.map((photo) => photo.dataUrl),
        settings,
        (progress, message) => setOcrStatus(`${message} · ${Math.round(progress * 100)}%`),
      );
      setOcrResult(parsed);
      setDraft((currentDraft) => ({
        ...currentDraft,
        fullName: currentDraft.fullName || parsed.fullName?.value || '',
        company: currentDraft.company || parsed.company?.value || '',
        jobTitle: currentDraft.jobTitle || parsed.jobTitle?.value || '',
        phone: currentDraft.phone || parsed.phone?.value || '',
        email: currentDraft.email || parsed.email?.value || '',
        website: currentDraft.website || parsed.website?.value || '',
        address: currentDraft.address || parsed.address?.value || '',
        ocrText: parsed.rawText,
      }));
      setOcrStatus(`Готово · ${parsed.provider === 'cloud' ? 'онлайн OCR' : 'локальный OCR'}`);
    } catch (error) {
      console.error(error);
      setOcrStatus(error instanceof Error ? error.message : 'OCR не выполнен');
    } finally {
      setBusy(false);
    }
  }

  function setPhotoSide(id: string, side: CardPhotoSide) {
    update('photos', draft.photos.map((photo) => (photo.id === id ? { ...photo, side } : photo)));
  }

  if (!open) return null;

  const confidence = (key: keyof Pick<OcrResult, 'fullName' | 'company' | 'jobTitle' | 'phone' | 'email' | 'website' | 'address'>) => {
    const value = ocrResult?.[key]?.confidence;
    if (value == null) return null;
    return <span className={`confidence ${confidenceClass(value)}`}>{value >= 0.85 ? '✓' : '!'} {Math.round(value * 100)}%</span>;
  };

  return (
    <div className="editor-screen">
      <header className="editor-topbar">
        <button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <div>
          <h2>{card ? 'Редактирование контакта' : 'Новый контакт'}</h2>
          <p>{card ? card.fullName || 'Без имени' : 'Добавьте фото или заполните поля вручную'}</p>
        </div>
        <button className="primary-button" disabled={busy} onClick={() => onSave(draft)}><Save size={17} />Сохранить</button>
      </header>

      <div className="editor-page">
        <aside className="capture-panel">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addFiles(e.target.files)} />
          <button className="upload-drop" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Camera size={25} />
            <strong>{draft.photos.length ? 'Добавить ещё фото' : 'Добавить фото визитки'}</strong>
            <span>Можно выбрать лицевую и оборотную стороны</span>
          </button>

          <div className="photo-list">
            {draft.photos.map((photo) => (
              <div className="photo-item" key={photo.id}>
                <img src={photo.dataUrl} alt={photo.fileName} />
                <div className="photo-item-controls">
                  <select value={photo.side} onChange={(e) => setPhotoSide(photo.id, e.target.value as CardPhotoSide)}>
                    <option value="front">Лицевая</option>
                    <option value="back">Оборотная</option>
                    <option value="other">Другое</option>
                  </select>
                  <button className="icon-button danger" onClick={() => update('photos', draft.photos.filter((item) => item.id !== photo.id))} aria-label="Удалить фото">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {draft.photos.length > 0 && (
            <button className="secondary-button full" onClick={() => void runOcr()} disabled={!canRunOcr}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <FileImage size={17} />}
              Распознать повторно
            </button>
          )}
          {ocrStatus && <p className="ocr-status">{ocrStatus}</p>}
        </aside>

        <form className="card-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
          <div className="form-section">
            <h3>Проверьте контактные данные</h3>
            <p>OCR заполняет поля как предложение. Перед сохранением исправьте сомнительные значения.</p>
          </div>

          <label>Имя {confidence('fullName')}<input value={draft.fullName} onChange={(e) => update('fullName', e.target.value)} /></label>
          <label>Компания {confidence('company')}<input value={draft.company} onChange={(e) => update('company', e.target.value)} /></label>
          <label>Должность {confidence('jobTitle')}<input value={draft.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} /></label>
          <div className="field-row">
            <label>Телефон {confidence('phone')}<input value={draft.phone} onChange={(e) => update('phone', e.target.value)} inputMode="tel" /></label>
            <label>Email {confidence('email')}<input value={draft.email} onChange={(e) => update('email', e.target.value)} inputMode="email" /></label>
          </div>
          <label>Сайт {confidence('website')}<input value={draft.website} onChange={(e) => update('website', e.target.value)} inputMode="url" /></label>
          <label>Адрес {confidence('address')}<input value={draft.address} onChange={(e) => update('address', e.target.value)} /></label>
          <label>Теги<input value={draft.tags.join(', ')} onChange={(e) => update('tags', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="выставка, поставщик, аналитика" /></label>
          <label>Папка<select value={draft.folderId} onChange={(e) => update('folderId', e.target.value)}>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
          <label>Комментарий<textarea value={draft.comment} onChange={(e) => update('comment', e.target.value)} rows={4} /></label>
          <label className="checkbox-label"><input type="checkbox" checked={draft.starred} onChange={(e) => update('starred', e.target.checked)} /> Важный контакт</label>

          {draft.ocrText && (
            <details className="ocr-details">
              <summary><ChevronDown size={15} />Исходный распознанный текст</summary>
              <textarea className="ocr-text" value={draft.ocrText} onChange={(e) => update('ocrText', e.target.value)} rows={6} />
            </details>
          )}
        </form>
      </div>
    </div>
  );
}
