import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, FileImage, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import type { BusinessCard, CardDraft, CardPhoto, CardPhotoSide, Folder } from '../types';
import { compressImage } from '../lib/images';
import { recognizeImages } from '../lib/ocr';

interface Props {
  open: boolean;
  folders: Folder[];
  card?: BusinessCard | null;
  initialDraft?: CardDraft | null;
  initialFolderId?: string;
  ocrLanguage: string;
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
  comment: '',
  starred: false,
  photos: [],
  ocrText: '',
});

export function CardEditor({ open, folders, card, initialDraft, initialFolderId, ocrLanguage, onClose, onSave }: Props) {
  const fallbackFolder = initialFolderId || folders[0]?.id || 'inbox';
  const [draft, setDraft] = useState<CardDraft>(blankDraft(fallbackFolder));
  const [busy, setBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
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
        comment: card.comment,
        starred: card.starred,
        photos: card.photos,
        ocrText: card.ocrText,
      });
      setOcrStatus('');
    } else if (initialDraft) {
      setDraft({ ...initialDraft, folderId: initialDraft.folderId || fallbackFolder });
      setOcrStatus('Данные получены из отсканированного QR. Проверьте поля перед сохранением.');
    } else {
      setDraft(blankDraft(fallbackFolder));
      setOcrStatus('');
    }
  }, [open, card, initialDraft, fallbackFolder]);

  const canRunOcr = useMemo(() => draft.photos.length > 0 && !busy, [draft.photos.length, busy]);

  const update = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const newPhotos: CardPhoto[] = [];
      for (let i = 0; i < files.length; i += 1) newPhotos.push(await compressImage(files[i]));
      setDraft((current) => ({ ...current, photos: [...current.photos, ...newPhotos] }));
      // Automatic OCR after image selection; user confirms/corrects fields before save.
      await runOcr([...draft.photos, ...newPhotos]);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function runOcr(photos = draft.photos) {
    if (!photos.length) return;
    setBusy(true);
    setOcrStatus('Запуск OCR…');
    try {
      const parsed = await recognizeImages(
        photos.map((photo) => photo.dataUrl),
        ocrLanguage,
        (progress, message) => setOcrStatus(`${message} · ${Math.round(progress * 100)}%`),
      );
      setDraft((current) => ({
        ...current,
        fullName: current.fullName || parsed.fullName,
        company: current.company || parsed.company,
        jobTitle: current.jobTitle || parsed.jobTitle,
        phone: current.phone || parsed.phone,
        email: current.email || parsed.email,
        website: current.website || parsed.website,
        ocrText: parsed.rawText,
      }));
      setOcrStatus('OCR завершён. Проверьте поля перед сохранением.');
    } catch (error) {
      console.error(error);
      setOcrStatus('OCR не выполнен. Проверьте подключение к интернету для загрузки языковой модели или заполните поля вручную.');
    } finally {
      setBusy(false);
    }
  }

  function setPhotoSide(id: string, side: CardPhotoSide) {
    update('photos', draft.photos.map((photo) => (photo.id === id ? { ...photo, side } : photo)));
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={card ? 'Редактирование визитки' : 'Новая визитка'}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">{card ? 'Редактирование' : 'Новая запись'}</span>
            <h2>{card ? card.fullName || 'Визитка' : 'Добавить визитку'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </header>

        <div className="editor-grid">
          <div className="photo-panel">
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addFiles(e.target.files)} />
            <button className="upload-drop" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Camera size={26} />
              <strong>Добавить фото</strong>
              <span>Лицевая и оборотная сторона, JPG/PNG/HEIC если поддерживается устройством</span>
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
                Повторить OCR
              </button>
            )}
            {ocrStatus && <p className="ocr-status">{ocrStatus}</p>}
          </div>

          <form className="card-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
            <label>Папка<select value={draft.folderId} onChange={(e) => update('folderId', e.target.value)}>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
            <label>Имя<input value={draft.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Иван Иванов" /></label>
            <label>Компания<input value={draft.company} onChange={(e) => update('company', e.target.value)} placeholder="ООО Компания" /></label>
            <label>Должность<input value={draft.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="Коммерческий директор" /></label>
            <div className="field-row">
              <label>Телефон<input value={draft.phone} onChange={(e) => update('phone', e.target.value)} inputMode="tel" /></label>
              <label>Email<input value={draft.email} onChange={(e) => update('email', e.target.value)} inputMode="email" /></label>
            </div>
            <label>Сайт<input value={draft.website} onChange={(e) => update('website', e.target.value)} inputMode="url" /></label>
            <label>Комментарий<textarea value={draft.comment} onChange={(e) => update('comment', e.target.value)} rows={4} placeholder="Что важно помнить об этом контакте" /></label>
            <label>Распознанный текст<textarea className="ocr-text" value={draft.ocrText} onChange={(e) => update('ocrText', e.target.value)} rows={5} placeholder="Результат OCR" /></label>
            <label className="checkbox-label"><input type="checkbox" checked={draft.starred} onChange={(e) => update('starred', e.target.checked)} /> Важная визитка</label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Отмена</button>
              <button type="submit" className="primary-button" disabled={busy}><Plus size={17} /> {card ? 'Сохранить' : 'Добавить'}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
