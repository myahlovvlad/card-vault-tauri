import { Building2, Globe2, Mail, Phone } from 'lucide-react';
import type { BusinessCard } from '../types';

interface Props {
  card: BusinessCard;
  className?: string;
}

/** The front face of a "my card" — shared between the wallet stack, the editor preview, and present mode. */
export function WalletCardFace({ card, className }: Props) {
  return (
    <div className={`wallet-face ${className ?? ''}`}>
      <div className="wallet-face-mark">CardVault</div>
      <div className="wallet-face-body">
        <h3>{card.fullName || 'Без имени'}</h3>
        <p className="wallet-face-role">{[card.jobTitle, card.company].filter(Boolean).join(' · ') || 'Должность и компания'}</p>
      </div>
      <div className="wallet-face-contacts">
        {card.phone && <span><Phone size={13} />{card.phone}</span>}
        {card.email && <span><Mail size={13} />{card.email}</span>}
        {card.website && <span><Globe2 size={13} />{card.website}</span>}
        {!card.phone && !card.email && !card.website && <span className="muted"><Building2 size={13} />Добавьте контакты</span>}
      </div>
    </div>
  );
}
