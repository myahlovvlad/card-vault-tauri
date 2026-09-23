import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, ChevronDown, Download, FileSpreadsheet, Folder, FolderPlus, Images, Menu, MoreHorizontal,
  Plus, ScanLine, Search, Settings2, Star, Upload, UserRound, WalletCards, X,
} from 'lucide-react';
import './styles.css';
import type { AppData, BusinessCard, CardDraft } from './types';
import { BusinessCardView } from './components/BusinessCardView';
import { CardEditor } from './components/CardEditor';
import { CardPresent } from './components/CardPresent';
import { MyCardStack } from './components/MyCardStack';
import { OwnCardEditor } from './components/OwnCardEditor';
import { QrScanner } from './components/QrScanner';
import { SettingsPanel } from './components/SettingsPanel';
import { BatchScanner } from './components/BatchScanner';
import { downloadVCard, isVCard, parseVCard } from './lib/connectors';
import { exportArchive, exportContactsXlsx } from './lib/exportPackage';
import { exportContactsCsv, exportData, findDuplicate, importData, initialData, loadData, saveData } from './lib/storage';

export default function App() {
  const [data, setData] = useState<AppData>(initialData());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'vault' | 'mycards'>('vault');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BusinessCard | null>(null);
  const [pendingDraft, setPendingDraft] = useState<CardDraft | null>(null);
  const [ownEditorOpen, setOwnEditorOpen] = useState(false);
  const [editingOwnCard, setEditingOwnCard] = useState<BusinessCard | null>(null);
  const [presentingCard, setPresentingCard] = useState<BusinessCard | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadData().then((loaded) => { setData(loaded); setReady(true); });
  }, []);

  useEffect(() => {
    if (ready) void saveData(data);
  }, [data, ready]);

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.cards.forEach((card) => counts.set(card.folderId, (counts.get(card.folderId) ?? 0) + 1));
    return counts;
  }, [data.cards]);

  const visibleCards = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru');
    return data.cards
      .filter((card) => selectedFolder === 'all' || card.folderId === selectedFolder)
      .filter((card) => {
        if (!query) return true;
        return [
          card.fullName, card.company, card.jobTitle, card.phone, card.email, card.website,
          card.address, card.comment, card.ocrText, ...card.tags,
        ].join(' ').toLocaleLowerCase('ru').includes(query);
      })
      .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt.localeCompare(a.updatedAt));
  }, [data.cards, search, selectedFolder]);

  useEffect(() => {
    if (!visibleCards.length) {
      setSelectedCardId(null);
      return;
    }
    if (!selectedCardId || !visibleCards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(visibleCards[0].id);
    }
  }, [visibleCards, selectedCardId]);

  const selectedCard = visibleCards.find((card) => card.id === selectedCardId) ?? null;
  const selectedFolderName = selectedFolder === 'all' ? 'Все контакты' : data.folders.find((folder) => folder.id === selectedFolder)?.name ?? 'Папка';
  const targetFolder = selectedFolder === 'all' ? 'inbox' : selectedFolder;

  function createFolder() {
    const name = window.prompt('Название новой папки');
    if (!name?.trim()) return;
    const folder = { id: crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString() };
    setData((currentData) => ({ ...currentData, folders: [...currentData.folders, folder] }));
    setSelectedFolder(folder.id);
  }

  function removeFolder(folderId: string) {
    if (folderId === 'inbox') return;
    const folder = data.folders.find((item) => item.id === folderId);
    if (!folder || !window.confirm(`Удалить папку «${folder.name}»? Контакты будут перенесены в «Без категории».`)) return;
    setData((currentData) => ({
      ...currentData,
      folders: currentData.folders.filter((item) => item.id !== folderId),
      cards: currentData.cards.map((card) => card.folderId === folderId ? { ...card, folderId: 'inbox', updatedAt: new Date().toISOString() } : card),
    }));
    if (selectedFolder === folderId) setSelectedFolder('all');
  }

  function openNewCard() {
    setEditingCard(null);
    setPendingDraft(null);
    setEditorOpen(true);
  }

  function saveCard(draft: CardDraft) {
    const duplicate = findDuplicate(data, draft as BusinessCard, editingCard?.id);
    if (duplicate && !window.confirm(`Похожий контакт уже существует: ${duplicate.fullName || duplicate.company}. Всё равно сохранить?`)) return;

    const now = new Date().toISOString();
    setData((currentData) => {
      if (editingCard) {
        return {
          ...currentData,
          cards: currentData.cards.map((card) => card.id === editingCard.id ? { ...card, ...draft, updatedAt: now } : card),
        };
      }
      const newCard = { id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now };
      setSelectedCardId(newCard.id);
      return { ...currentData, cards: [newCard, ...currentData.cards] };
    });
    setEditorOpen(false);
    setEditingCard(null);
    setPendingDraft(null);
  }

  function saveBatch(drafts: CardDraft[]) {
    const now = new Date().toISOString();
    const accepted: BusinessCard[] = [];
    for (const draft of drafts) {
      const duplicate = findDuplicate({ ...data, cards: [...data.cards, ...accepted] }, draft as BusinessCard);
      if (duplicate) continue;
      accepted.push({ id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now });
    }
    setData((currentData) => ({ ...currentData, cards: [...accepted, ...currentData.cards] }));
    setBatchOpen(false);
    if (accepted[0]) setSelectedCardId(accepted[0].id);
    if (accepted.length !== drafts.length) window.alert(`Сохранено ${accepted.length}. Пропущено дублей: ${drafts.length - accepted.length}.`);
  }

  function toggleStar(cardId: string) {
    setData((currentData) => ({
      ...currentData,
      cards: currentData.cards.map((card) => card.id === cardId ? { ...card, starred: !card.starred, updatedAt: new Date().toISOString() } : card),
    }));
  }

  function deleteCard(cardId: string) {
    if (!window.confirm('Удалить этот контакт?')) return;
    setData((currentData) => ({ ...currentData, cards: currentData.cards.filter((card) => card.id !== cardId) }));
    setChecked((ids) => { const next = new Set(ids); next.delete(cardId); return next; });
  }

  function saveOwnCard(draft: CardDraft) {
    const now = new Date().toISOString();
    setData((currentData) => {
      if (editingOwnCard) {
        return { ...currentData, ownCards: currentData.ownCards.map((card) => card.id === editingOwnCard.id ? { ...card, ...draft, updatedAt: now } : card) };
      }
      return { ...currentData, ownCards: [...currentData.ownCards, { id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now }] };
    });
    setOwnEditorOpen(false);
    setEditingOwnCard(null);
  }

  function deleteOwnCard(cardId: string) {
    if (!window.confirm('Удалить эту визитку?')) return;
    setData((currentData) => ({ ...currentData, ownCards: currentData.ownCards.filter((card) => card.id !== cardId) }));
  }

  function handleScanned(text: string) {
    setScannerOpen(false);
    const draft = isVCard(text)
      ? parseVCard(text, targetFolder)
      : {
          folderId: targetFolder, fullName: '', company: '', jobTitle: '', phone: '', email: '',
          website: '', address: '', tags: [], comment: '', starred: false, photos: [], ocrText: text,
        };
    setPendingDraft(draft);
    setEditingCard(null);
    setView('vault');
    setEditorOpen(true);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const imported = await importData(file);
      setData(imported);
      setSelectedFolder('all');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Не удалось импортировать файл.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }

  function toggleChecked(id: string) {
    setChecked((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function deleteChecked() {
    if (!checked.size || !window.confirm(`Удалить выбранные контакты (${checked.size})?`)) return;
    setData((currentData) => ({ ...currentData, cards: currentData.cards.filter((card) => !checked.has(card.id)) }));
    setChecked(new Set());
  }

  function moveChecked(folderId: string) {
    if (!checked.size) return;
    const now = new Date().toISOString();
    setData((currentData) => ({
      ...currentData,
      cards: currentData.cards.map((card) => checked.has(card.id) ? { ...card, folderId, updatedAt: now } : card),
    }));
    setChecked(new Set());
  }

  function selectedData(): AppData {
    return { ...data, cards: data.cards.filter((card) => checked.has(card.id)) };
  }

  if (!ready) return <div className="loading-screen">Загрузка CardVault…</div>;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Archive size={19} /></div>
          <div><strong>CardVault</strong><span>Контакты и визитки</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
        </div>

        <nav className="folder-nav">
          <button className={view === 'vault' && selectedFolder === 'all' ? 'active' : ''} onClick={() => { setView('vault'); setSelectedFolder('all'); setSidebarOpen(false); }}>
            <span><UserRound size={17} />Все контакты</span><b>{data.cards.length}</b>
          </button>
          <button className={`wallet-nav-button ${view === 'mycards' ? 'active' : ''}`} onClick={() => { setView('mycards'); setSidebarOpen(false); }}>
            <span><WalletCards size={17} />Моя визитка</span><b>{data.ownCards.length}</b>
          </button>
          <div className="nav-section-title">Папки</div>
          {data.folders.map((folder) => (
            <div className="folder-row" key={folder.id}>
              <button className={view === 'vault' && selectedFolder === folder.id ? 'active' : ''} onClick={() => { setView('vault'); setSelectedFolder(folder.id); setSidebarOpen(false); }}>
                <span><Folder size={17} />{folder.name}</span><b>{folderCounts.get(folder.id) ?? 0}</b>
              </button>
              {folder.id !== 'inbox' && <button className="folder-delete" onClick={() => removeFolder(folder.id)} title="Удалить папку"><X size={14} /></button>}
            </div>
          ))}
          <button className="new-folder" onClick={createFolder}><FolderPlus size={17} />Новая папка</button>
        </nav>

        <button className="sidebar-settings" onClick={() => setSettingsOpen(true)}><Settings2 size={17} />Настройки</button>
      </aside>

      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          {view === 'vault' ? (
            <div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск контактов" />{search && <button onClick={() => setSearch('')}><X size={15} /></button>}</div>
          ) : <div className="topbar-title"><WalletCards size={18} />Моя визитка</div>}

          <div className="top-actions">
            <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(e) => void handleImport(e.target.files?.[0])} />
            {view === 'vault' && (
              <>
                <div className="action-menu">
                  <button className="secondary-button compact"><Download size={16} /><span>Экспорт</span><ChevronDown size={13} /></button>
                  <div className="menu-popover">
                    <button onClick={() => exportContactsXlsx(data)}><FileSpreadsheet size={16} />Excel (.xlsx)</button>
                    <button onClick={() => void exportArchive(data)}><Archive size={16} />Excel + фото (.zip)</button>
                    <button onClick={() => exportContactsCsv(data)}><Download size={16} />CSV</button>
                    <button onClick={() => exportData(data)}><Download size={16} />Резервная копия JSON</button>
                    <button onClick={() => importRef.current?.click()}><Upload size={16} />Импорт JSON</button>
                  </div>
                </div>
                <div className="action-menu">
                  <button className="primary-button"><Plus size={17} /><span>Добавить</span><ChevronDown size={13} /></button>
                  <div className="menu-popover">
                    <button onClick={openNewCard}><Plus size={16} />Контакт / фото визитки</button>
                    <button onClick={() => setBatchOpen(true)}><Images size={16} />Пакетное сканирование</button>
                    <button onClick={() => setScannerOpen(true)}><ScanLine size={16} />Сканировать QR</button>
                  </div>
                </div>
              </>
            )}
            {view === 'mycards' && <button className="primary-button" onClick={() => { setEditingOwnCard(null); setOwnEditorOpen(true); }}><Plus size={17} />Новая визитка</button>}
          </div>
        </header>

        {view === 'mycards' ? (
          <MyCardStack
            cards={data.ownCards}
            onAdd={() => { setEditingOwnCard(null); setOwnEditorOpen(true); }}
            onEdit={(card) => { setEditingOwnCard(card); setOwnEditorOpen(true); }}
            onDelete={deleteOwnCard}
            onPresent={setPresentingCard}
          />
        ) : (
          <section className="content contacts-content">
            <div className="simple-heading">
              <div><h1>{selectedFolderName}</h1><p>{visibleCards.length} контактов</p></div>
              <button className="mobile-add primary-button" onClick={openNewCard}><Plus size={17} />Добавить</button>
            </div>

            {checked.size > 0 && (
              <div className="bulk-toolbar">
                <strong>Выбрано: {checked.size}</strong>
                <select defaultValue="" onChange={(e) => { if (e.target.value) moveChecked(e.target.value); }}>
                  <option value="" disabled>Переместить в…</option>
                  {data.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
                <button onClick={() => exportContactsXlsx(selectedData())}>Excel</button>
                <button onClick={() => void exportArchive(selectedData())}>ZIP + фото</button>
                <button className="danger-text" onClick={deleteChecked}>Удалить</button>
                <button className="plain-icon" onClick={() => setChecked(new Set())}><X size={16} /></button>
              </div>
            )}

            {visibleCards.length === 0 ? (
              <div className="empty-state">
                <h2>{search ? 'Ничего не найдено' : 'Пока нет контактов'}</h2>
                <p>{search ? 'Измените поисковый запрос.' : 'Добавьте визитку, сфотографируйте несколько карточек пакетно или отсканируйте QR.'}</p>
                {!search && <button className="primary-button" onClick={openNewCard}><Plus size={17} />Добавить контакт</button>}
              </div>
            ) : (
              <div className="contacts-workspace">
                <div className="contact-list">
                  {visibleCards.map((card) => {
                    const image = card.photos.find((photo) => photo.side === 'front') ?? card.photos[0];
                    return (
                      <div className={`contact-row ${selectedCardId === card.id ? 'selected' : ''}`} key={card.id} onClick={() => setSelectedCardId(card.id)}>
                        <input type="checkbox" checked={checked.has(card.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleChecked(card.id)} aria-label="Выбрать контакт" />
                        <div className="contact-thumb">{image ? <img src={image.dataUrl} alt="" /> : <UserRound size={19} />}</div>
                        <div className="contact-summary">
                          <div><strong>{card.fullName || 'Без имени'}</strong>{card.starred && <Star size={13} fill="currentColor" />}</div>
                          <span>{[card.jobTitle, card.company].filter(Boolean).join(' · ') || card.phone || card.email || 'Нет данных'}</span>
                        </div>
                        <MoreHorizontal size={16} className="row-more" />
                      </div>
                    );
                  })}
                </div>

                <div className="contact-detail-pane">
                  {selectedCard ? (
                    <BusinessCardView
                      card={selectedCard}
                      folderName={data.folders.find((folder) => folder.id === selectedCard.folderId)?.name ?? 'Без категории'}
                      onToggleStar={() => toggleStar(selectedCard.id)}
                      onEdit={() => { setEditingCard(selectedCard); setPendingDraft(null); setEditorOpen(true); }}
                      onDelete={() => deleteCard(selectedCard.id)}
                      onExportVCard={() => downloadVCard(selectedCard)}
                    />
                  ) : <div className="detail-placeholder">Выберите контакт</div>}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="mobile-bottom-nav">
        <button className={view === 'vault' ? 'active' : ''} onClick={() => setView('vault')}><UserRound size={20} /><span>Контакты</span></button>
        <button className="scan-main" onClick={openNewCard}><ScanLine size={22} /><span>Сканировать</span></button>
        <button className={view === 'mycards' ? 'active' : ''} onClick={() => setView('mycards')}><WalletCards size={20} /><span>Моя визитка</span></button>
      </nav>

      <CardEditor
        open={editorOpen}
        folders={data.folders}
        card={editingCard}
        initialDraft={pendingDraft}
        initialFolderId={targetFolder}
        settings={data.settings}
        onClose={() => { setEditorOpen(false); setEditingCard(null); setPendingDraft(null); }}
        onSave={saveCard}
      />
      <BatchScanner open={batchOpen} folders={data.folders} settings={data.settings} defaultFolderId={targetFolder} onClose={() => setBatchOpen(false)} onSave={saveBatch} />
      <OwnCardEditor open={ownEditorOpen} card={editingOwnCard} onClose={() => { setOwnEditorOpen(false); setEditingOwnCard(null); }} onSave={saveOwnCard} />
      <CardPresent card={presentingCard} onClose={() => setPresentingCard(null)} />
      <QrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDecoded={handleScanned} />
      <SettingsPanel open={settingsOpen} settings={data.settings} onChange={(settings) => setData((currentData) => ({ ...currentData, settings }))} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
