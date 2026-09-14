import { useEffect, useState } from 'react';
import { Edit3, Plus, QrCode, Trash2, WalletCards } from 'lucide-react';
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
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= cards.length) setActiveIndex(Math.max(0, cards.length - 1));
  }, [cards.length, activeIndex]);

  const active = cards[activeIndex];

  return (
    <section className="content mycards-content">
      {/*
        THESIS: My Cards is a wallet you carry, not a grid you browse — your own card(s) live as a
        swipeable fanned stack, refusing the flat received-card grid used everywhere else in the app.
        OWN-WORLD: same neutral/off-white surface, dark sidebar and burgundy accent as the rest of
        CardVault; the stack adds layered card silhouettes with soft cast shadows and a fanned
        3D-ish spread, plus a full-screen "present" ritual (dimmed scrim, oversized QR) for the handoff.
        STORY: user opens "Мои визитки", sees card(s) fanned like a real wallet; tapping the front
        card opens a distraction-free full-screen QR; a "Сканировать" action decodes someone else's
        QR straight into the existing confirm-and-save flow.
        FIRST VIEWPORT: unchanged sidebar; header "Мои визитки"; a fanned stack of card silhouettes
        with a dashed "add" card behind them; Показать QR / Новая визитка docked below.
        FORM: candidate 5 of 7 (wallet fan/stack carousel), seed key 638227bf.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review,
        the verdict, and DESIGN.md.
      */}
      <div className="content-heading">
        <div>
          <span className="eyebrow">Обмен визитками</span>
          <h1>Мои визитки</h1>
          <p>Держите свою визитку под рукой — покажите QR вместо бумажной карточки.</p>
        </div>
      </div>

      <div className="wallet-stack-area">
        <div className="wallet-stack" style={{ '--count': cards.length } as React.CSSProperties}>
          {cards.length === 0 && (
            <button className="wallet-card wallet-card-empty" onClick={onAdd}>
              <WalletCards size={28} />
              <strong>Пока пусто</strong>
              <span>Создайте свою первую визитку</span>
            </button>
          )}
          {cards.map((card, index) => {
            const offset = (index - activeIndex + cards.length) % cards.length;
            const isFront = offset === 0;
            return (
              <button
                key={card.id}
                className={`wallet-card ${isFront ? 'is-front' : ''}`}
                style={{ '--offset': offset, zIndex: cards.length - offset } as React.CSSProperties}
                onClick={() => (isFront ? onPresent(card) : setActiveIndex(index))}
                aria-label={isFront ? `Показать QR визитки ${card.fullName}` : `Сделать активной визитку ${card.fullName}`}
              >
                <WalletCardFace card={card} />
                {isFront && <span className="wallet-card-hint"><QrCode size={13} />Нажмите, чтобы показать QR</span>}
              </button>
            );
          })}
          {cards.length > 0 && cards.length < 4 && (
            <button className="wallet-card wallet-card-ghost" style={{ '--offset': cards.length, zIndex: 0 } as React.CSSProperties} onClick={onAdd} aria-label="Добавить ещё одну визитку">
              <Plus size={22} />
            </button>
          )}
        </div>

        {cards.length > 1 && (
          <div className="wallet-dots">
            {cards.map((card, index) => (
              <button key={card.id} className={index === activeIndex ? 'active' : ''} onClick={() => setActiveIndex(index)} aria-label={`Визитка ${index + 1}`} />
            ))}
          </div>
        )}

        <div className="wallet-actions">
          <button className="primary-button" disabled={!active} onClick={() => active && onPresent(active)}><QrCode size={18} />Показать QR</button>
          <button className="secondary-button" onClick={onAdd}><Plus size={17} />Новая визитка</button>
          {active && <button className="secondary-button" onClick={() => onEdit(active)}><Edit3 size={16} />Изменить</button>}
          {active && <button className="secondary-button danger" onClick={() => onDelete(active.id)}><Trash2 size={16} />Удалить</button>}
        </div>
      </div>
    </section>
  );
}
