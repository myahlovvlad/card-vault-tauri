import { Edit3, Plus, QrCode, Trash2 } from 'lucide-react';
import type { BusinessCard } from '../types';
import { WalletCardFace } from './WalletCardFace';

interface Props {
  cards: BusinessCard[];
  onAdd: () => void;
  onEdit: (card: BusinessCard) => void;
  onDelete: (id: string) => void;
  onPresent: (card: BusinessCard) => void;
}

export function MyCardStack({ cards, onAdd, onEdit, onDelete, onPresent }: Props) {
  const primary = cards[0];

  return (
    <section className="content mycards-content">
      <div className="simple-heading">
        <div><h1>Моя визитка</h1><p>Покажите QR-код или поделитесь контактами без бумажной карточки.</p></div>
        <button className="secondary-button" onClick={onAdd}><Plus size={17} />Новая визитка</button>
      </div>

      {!primary ? (
        <div className="empty-state compact-empty">
          <h2>Создайте свою визитку</h2>
          <p>Она будет доступна для быстрого показа QR-кода и отправки через системное меню.</p>
          <button className="primary-button" onClick={onAdd}><Plus size={17} />Создать</button>
        </div>
      ) : (
        <div className="mycard-layout">
          <div className="mycard-preview"><WalletCardFace card={primary} /></div>
          <div className="mycard-actions">
            <button className="primary-button" onClick={() => onPresent(primary)}><QrCode size={18} />Показать QR</button>
            <button className="secondary-button" onClick={() => onEdit(primary)}><Edit3 size={16} />Изменить</button>
            <button className="secondary-button danger" onClick={() => onDelete(primary.id)}><Trash2 size={16} />Удалить</button>
          </div>
        </div>
      )}

      {cards.length > 1 && (
        <div className="other-own-cards">
          <h2>Другие визитки</h2>
          {cards.slice(1).map((card) => (
            <div className="own-card-row" key={card.id}>
              <div><strong>{card.fullName || 'Без имени'}</strong><span>{[card.jobTitle, card.company].filter(Boolean).join(' · ')}</span></div>
              <div>
                <button className="secondary-button compact" onClick={() => onPresent(card)}><QrCode size={15} />QR</button>
                <button className="icon-button" onClick={() => onEdit(card)}><Edit3 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
