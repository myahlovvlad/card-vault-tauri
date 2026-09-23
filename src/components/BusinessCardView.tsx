import { Building2, Download, Edit3, Globe2, Mail, MapPin, MoreHorizontal, Phone, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { BusinessCard } from '../types';

interface Props {
  card: BusinessCard;
  folderName: string;
  onToggleStar: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExportVCard: () => void;
}

export function BusinessCardView({ card, folderName, onToggleStar, onEdit, onDelete, onExportVCard }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const image = card.photos.find((photo) => photo.side === 'front') ?? card.photos[0];

  return (
    <article className="contact-detail">
      <header className="detail-header">
        <div className="detail-avatar">
          {image ? <img src={image.dataUrl} alt="" /> : <Building2 size={28} />}
        </div>
        <div className="detail-title">
          <div className="detail-name-row">
            <h2>{card.fullName || 'Без имени'}</h2>
            <button className={`plain-icon ${card.starred ? 'active' : ''}`} onClick={onToggleStar} title="Важный контакт">
              <Star size={19} fill={card.starred ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p>{[card.jobTitle, card.company].filter(Boolean).join(' · ') || 'Компания и должность не указаны'}</p>
          <span>{folderName}</span>
        </div>
        <div className="detail-menu">
          <button className="icon-button" onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={19} /></button>
          {menuOpen && (
            <div className="context-menu">
              <button onClick={() => { setMenuOpen(false); onEdit(); }}><Edit3 size={15} />Изменить</button>
              <button onClick={() => { setMenuOpen(false); onExportVCard(); }}><Download size={15} />Экспорт vCard</button>
              <hr />
              <button className="danger-text" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={15} />Удалить</button>
            </div>
          )}
        </div>
      </header>

      <section className="detail-section">
        <h3>Контакты</h3>
        <div className="detail-lines">
          {card.phone && <a href={`tel:${card.phone}`}><Phone size={16} /><span><small>Телефон</small>{card.phone}</span></a>}
          {card.email && <a href={`mailto:${card.email}`}><Mail size={16} /><span><small>Email</small>{card.email}</span></a>}
          {card.website && <a href={/^https?:\/\//i.test(card.website) ? card.website : `https://${card.website}`} target="_blank" rel="noreferrer"><Globe2 size={16} /><span><small>Сайт</small>{card.website}</span></a>}
          {card.address && <div><MapPin size={16} /><span><small>Адрес</small>{card.address}</span></div>}
          {!card.phone && !card.email && !card.website && !card.address && <p className="muted-copy">Контактные данные не заполнены.</p>}
        </div>
      </section>

      {card.tags.length > 0 && (
        <section className="detail-section">
          <h3>Теги</h3>
          <div className="tag-list">{card.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </section>
      )}

      {card.comment && <section className="detail-section"><h3>Заметка</h3><p className="detail-note">{card.comment}</p></section>}

      {card.photos.length > 0 && (
        <section className="detail-section">
          <h3>Фотографии</h3>
          <div className="detail-photos">
            {card.photos.map((photo) => <a key={photo.id} href={photo.dataUrl} target="_blank" rel="noreferrer"><img src={photo.dataUrl} alt={photo.fileName} /></a>)}
          </div>
        </section>
      )}
    </article>
  );
}
