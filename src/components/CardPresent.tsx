import { Download, Share2, X } from 'lucide-react';
import type { BusinessCard } from '../types';
import { createVCard, downloadVCard } from '../lib/connectors';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  card: BusinessCard | null;
  onClose: () => void;
}

export function CardPresent({ card, onClose }: Props) {
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (!card) return;
    void QRCode.toDataURL(createVCard(card), { margin: 1, width: 720 }).then(setQr);
  }, [card]);

  if (!card) return null;

  async function share() {
    const file = new File([createVCard(card)], `${card.fullName || 'contact'}.vcf`, { type: 'text/vcard' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: card.fullName, files: [file] });
      return;
    }
    downloadVCard(card);
  }

  return (
    <div className="present-overlay">
      <button className="icon-button overlay-close" onClick={onClose}><X size={20} /></button>
      <div className="present-panel">
        <div className="present-info">
          <h1>{card.fullName || 'Моя визитка'}</h1>
          <p>{[card.jobTitle, card.company].filter(Boolean).join(' · ')}</p>
          {card.phone && <span>{card.phone}</span>}
          {card.email && <span>{card.email}</span>}
          {card.website && <span>{card.website}</span>}
        </div>
        {qr && <img className="present-qr" src={qr} alt="QR-код визитки" />}
      </div>
      <div className="present-actions">
        <button className="primary-button" onClick={() => void share()}><Share2 size={17} />Поделиться</button>
        <button className="secondary-button present-actions-ghost" onClick={() => downloadVCard(card)}><Download size={17} />vCard</button>
      </div>
    </div>
  );
}
