import { useRef, useState } from 'react';
import { Images, LoaderCircle, Save, X } from 'lucide-react';
import type { AppSettings, CardDraft, Folder } from '../types';
import { compressImage } from '../lib/images';
import { recognizeImages } from '../lib/ocr';

interface Props {
  open: boolean;
  folders: Folder[];
  settings: AppSettings;
  defaultFolderId: string;
  onClose: () => void;
  onSave: (drafts: CardDraft[]) => void;
}

export function BatchScanner({ open, folders, settings, defaultFolderId, onClose, onSave }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<CardDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  if (!open) return null;

  async function process(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setDrafts([]);
    const next: CardDraft[] = [];
    try {
      for (let i = 0; i < files.length; i += 1) {
        setStatus(`Распознавание ${i + 1} из ${files.length}`);
        const photo = await compressImage(files[i]);
        const result = await recognizeImages([photo.dataUrl], settings);
        next.push({
          folderId: defaultFolderId,
          fullName: result.fullName?.value ?? '',
          company: result.company?.value ?? '',
          jobTitle: result.jobTitle?.value ?? '',
          phone: result.phone?.value ?? '',
          email: result.email?.value ?? '',
          website: result.website?.value ?? '',
          address: result.address?.value ?? '',
          tags: [],
          comment: '',
          starred: false,
          photos: [{ ...photo, side: 'front' }],
          ocrText: result.rawText,
        });
        setDrafts([...next]);
      }
      setStatus('Проверьте результаты перед сохранением');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const patch = (index: number, key: keyof CardDraft, value: CardDraft[keyof CardDraft]) =>
    setDrafts((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));

  return (
    <div className="editor-screen">
      <header className="editor-topbar">
        <button className="icon-button" onClick={onClose}><X size={20} /></button>
        <div><h2>Пакетное сканирование</h2><p>Одна фотография = один контакт</p></div>
        <button className="primary-button" disabled={!drafts.length || busy} onClick={() => onSave(drafts)}><Save size={17} />Сохранить {drafts.length || ''}</button>
      </header>
      <div className="batch-page">
        <input ref={inputRef} hidden type="file" accept="image/*" multiple onChange={(e) => void process(e.target.files)} />
        <button className="batch-drop" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={24} /> : <Images size={24} />}
          <strong>Выбрать фотографии визиток</strong>
          <span>Можно выбрать несколько файлов за один раз</span>
        </button>
        {status && <p className="batch-status">{status}</p>}
        <div className="batch-table">
          {drafts.map((draft, index) => (
            <div className="batch-row" key={index}>
              <img src={draft.photos[0]?.dataUrl} alt="" />
              <div className="batch-fields">
                <input value={draft.fullName} onChange={(e) => patch(index, 'fullName', e.target.value)} placeholder="Имя" />
                <input value={draft.company} onChange={(e) => patch(index, 'company', e.target.value)} placeholder="Компания" />
                <input value={draft.phone} onChange={(e) => patch(index, 'phone', e.target.value)} placeholder="Телефон" />
                <input value={draft.email} onChange={(e) => patch(index, 'email', e.target.value)} placeholder="Email" />
                <select value={draft.folderId} onChange={(e) => patch(index, 'folderId', e.target.value)}>
                  {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
              </div>
              <button className="icon-button danger" onClick={() => setDrafts((items) => items.filter((_, i) => i !== index))}><X size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
