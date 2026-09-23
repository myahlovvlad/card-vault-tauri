import { X } from 'lucide-react';
import type { AppSettings, OcrMode } from '../types';

interface Props {
  open: boolean;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export function SettingsPanel({ open, settings, onChange, onClose }: Props) {
  if (!open) return null;
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onChange({ ...settings, [key]: value });

  return (
    <div className="settings-sheet">
      <div className="settings-card">
        <header>
          <div><h2>Настройки</h2><p>OCR и обработка данных</p></div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="settings-body">
          <label>Режим OCR
            <select value={settings.ocrMode} onChange={(e) => set('ocrMode', e.target.value as OcrMode)}>
              <option value="auto">Автоматически: онлайн → локально</option>
              <option value="local">Только локально</option>
              <option value="cloud">Только онлайн</option>
            </select>
          </label>
          <label>Языки OCR<input value={settings.ocrLanguage} onChange={(e) => set('ocrLanguage', e.target.value)} placeholder="rus+eng" /></label>
          <label className="checkbox-label">
            <input type="checkbox" checked={settings.allowCloudOcr} onChange={(e) => set('allowCloudOcr', e.target.checked)} />
            Разрешать отправку изображений в облачный OCR
          </label>
          <label>HTTPS endpoint
            <input value={settings.cloudOcrEndpoint} onChange={(e) => set('cloudOcrEndpoint', e.target.value)} placeholder="https://ocr.example.com/business-card" />
          </label>
          <p className="settings-note">API-ключи не должны храниться в приложении. Endpoint должен быть вашим серверным proxy к ABBYY, Google Vision или другому OCR-провайдеру.</p>
        </div>
      </div>
    </div>
  );
}
