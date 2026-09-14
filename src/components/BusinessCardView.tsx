import { Building2, Download, Edit3, Globe2, Mail, Phone, Star, Trash2 } from 'lucide-react';
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
  const image = card.photos.find((p) => p.side === 'front') ?? card.photos[0];
  return (
    <article className={`business-card ${card.starred ? 'starred' : ''}`}>
      <div className="card-image">
        {image ? <img src={image.dataUrl} alt={`Визитка ${card.fullName}`} /> : <div className="image-placeholder"><Building2 size={34} /></div>}
        {card.photos.length > 1 && <span className="photo-count">{card.photos.length} фото</span>}
        <button className={`star-button ${card.starred ? 'active' : ''}`} onClick={onToggleStar} aria-label={card.starred ? 'Убрать из важных' : 'Отметить как важную'}>
          <Star size={21} fill={card.starred ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-meta"><span>{folderName}</span>{card.starred && <b>Важная</b>}</div>
        <h3>{card.fullName || 'Без имени'}</h3>
        <p className="role">{[card.jobTitle, card.company].filter(Boolean).join(' · ') || 'Компания и должность не указаны'}</p>
        <div className="contact-lines">
          {card.phone && <a href={`tel:${card.phone}`}><Phone size={15} />{card.phone}</a>}
          {card.email && <a href={`mailto:${card.email}`}><Mail size={15} />{card.email}</a>}
          {card.website && <a href={/^https?:\/\//i.test(card.website) ? card.website : `https://${card.website}`} target="_blank" rel="noreferrer"><Globe2 size={15} />{card.website}</a>}
        </div>
        {card.comment && <p className="comment">{card.comment}</p>}
        <div className="card-actions">
          <button onClick={onEdit}><Edit3 size={16} />Изменить</button>
          <button onClick={onExportVCard}><Download size={16} />vCard</button>
          <button className="danger-text" onClick={onDelete}><Trash2 size={16} />Удалить</button>
        </div>
      </div>
    </article>
  );
}
