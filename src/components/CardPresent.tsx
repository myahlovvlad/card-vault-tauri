import { useEffect, useState } from 'react';
import { Check, Copy, Download, RotateCw, Share2, X } from 'lucide-react';
import type { BusinessCard } from '../types';
import { createVCard } from '../lib/connectors';
import { encodeQrDataUrl } from '../lib/qrcode';
import { WalletCardFace } from './WalletCardFace';

interface Props {
  card: BusinessCard | null;
  onClose: () => void;
}

export function CardPresent({ card, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showFront, setShowFront] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!card) return;
    setShowFront(false);
    setCopied(false);
    let cancelled = false;
    void encodeQrDataUrl(createVCard(card)).then((url) => { if (!cancelled) setQrDataUrl(url); });
    return () => { cancelled = true; };
  }, [card]);

  useEffect(() => {
    if (!card) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, onClose]);

  if (!card) return null;

  const vcard = createVCard(card);
  const fileName = `${card.fullName || 'contact'}.vcf`.replace(/[\\/:*?"<>|]/g, '_');

  function downloadVcf() {
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!card) return;
    try {
      const file = new File([vcard], fileName, { type: 'text/vcard' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: card.fullName, text: `Контакт ${card.fullName}` });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: card.fullName, text: vcard });
        return;
      }
    } catch {
      return; /* user cancelled the native share sheet */
    }
    downloadVcf();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(vcard);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="present-overlay" role="dialog" aria-modal="true" aria-label={`Поделиться визиткой ${card.fullName}`}>
      <button className="icon-button overlay-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>

      <div className={`present-card ${showFront ? 'is-front' : ''}`} onClick={() => setShowFront((v) => !v)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setShowFront((v) => !v)}>
        <div className="present-card-inner">
          <div className="present-face present-face-back">
            {qrDataUrl && <img src={qrDataUrl} alt={`QR-код визитки ${card.fullName}`} className="present-qr" />}
            <p className="present-name">{card.fullName || 'Без имени'}</p>
            <span className="present-hint"><RotateCw size={12} />Нажмите, чтобы увидеть детали</span>
          </div>
          <div className="present-face present-face-front">
            <WalletCardFace card={card} className="wallet-face-present" />
            <span className="present-hint"><RotateCw size={12} />Нажмите, чтобы вернуться к QR</span>
          </div>
        </div>
      </div>

      <div className="present-actions">
        <button className="primary-button" onClick={(e) => { e.stopPropagation(); void handleShare(); }}><Share2 size={17} />Поделиться</button>
        <button className="secondary-button present-actions-ghost" onClick={(e) => { e.stopPropagation(); void handleCopy(); }}>
          {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Скопировано' : 'Скопировать vCard'}
        </button>
        <button className="secondary-button present-actions-ghost" onClick={(e) => { e.stopPropagation(); downloadVcf(); }}><Download size={16} />Сохранить .vcf</button>
      </div>
    </div>
  );
}
