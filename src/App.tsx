import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ChevronDown, Download, Folder, FolderPlus, Menu, Plus, ScanLine, Search, Settings2, Upload, WalletCards, X } from 'lucide-react';
import './styles.css';
import type { AppData, BusinessCard, CardDraft } from './types';
import { BusinessCardView } from './components/BusinessCardView';
import { CardEditor } from './components/CardEditor';
import { CardPresent } from './components/CardPresent';
import { MyCardStack } from './components/MyCardStack';
import { OwnCardEditor } from './components/OwnCardEditor';
import { QrScanner } from './components/QrScanner';
import { downloadVCard, isVCard, parseVCard } from './lib/connectors';
import { exportContactsCsv, exportData, importData, initialData, loadData, saveData } from './lib/storage';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        return [card.fullName, card.company, card.jobTitle, card.phone, card.email, card.website, card.comment, card.ocrText]
          .join(' ')
          .toLocaleLowerCase('ru')
          .includes(query);
      })
      .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt.localeCompare(a.updatedAt));
  }, [data.cards, search, selectedFolder]);

  const selectedFolderName = selectedFolder === 'all' ? 'Все визитки' : data.folders.find((f) => f.id === selectedFolder)?.name ?? 'Папка';

  function createFolder() {
    const name = window.prompt('Название новой папки');
    if (!name?.trim()) return;
    const folder = { id: crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString() };
    setData((current) => ({ ...current, folders: [...current.folders, folder] }));
    setSelectedFolder(folder.id);
  }

  function removeFolder(folderId: string) {
    if (folderId === 'inbox') return;
    const folder = data.folders.find((f) => f.id === folderId);
    if (!folder || !window.confirm(`Удалить папку «${folder.name}»? Визитки будут перенесены в «Без категории».`)) return;
    setData((current) => ({
      ...current,
      folders: current.folders.filter((f) => f.id !== folderId),
      cards: current.cards.map((card) => card.folderId === folderId ? { ...card, folderId: 'inbox', updatedAt: new Date().toISOString() } : card),
    }));
    if (selectedFolder === folderId) setSelectedFolder('all');
  }

  function saveCard(draft: CardDraft) {
    const now = new Date().toISOString();
    setData((current) => {
      if (editingCard) {
        return { ...current, cards: current.cards.map((card) => card.id === editingCard.id ? { ...card, ...draft, updatedAt: now } : card) };
      }
      return { ...current, cards: [{ id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now }, ...current.cards] };
    });
    setEditorOpen(false);
    setEditingCard(null);
  }

  function toggleStar(cardId: string) {
    setData((current) => ({
      ...current,
      cards: current.cards.map((card) => card.id === cardId ? { ...card, starred: !card.starred, updatedAt: new Date().toISOString() } : card),
    }));
  }

  function deleteCard(cardId: string) {
    if (!window.confirm('Удалить эту визитку?')) return;
    setData((current) => ({ ...current, cards: current.cards.filter((card) => card.id !== cardId) }));
  }

  function saveOwnCard(draft: CardDraft) {
    const now = new Date().toISOString();
    setData((current) => {
      if (editingOwnCard) {
        return { ...current, ownCards: current.ownCards.map((card) => card.id === editingOwnCard.id ? { ...card, ...draft, updatedAt: now } : card) };
      }
      return { ...current, ownCards: [...current.ownCards, { id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now }] };
    });
    setOwnEditorOpen(false);
    setEditingOwnCard(null);
  }

  function deleteOwnCard(cardId: string) {
    if (!window.confirm('Удалить эту визитку?')) return;
    setData((current) => ({ ...current, ownCards: current.ownCards.filter((card) => card.id !== cardId) }));
  }

  function handleScanned(text: string) {
    setScannerOpen(false);
    const targetFolder = selectedFolder === 'all' ? 'inbox' : selectedFolder;
    const draft = isVCard(text)
      ? parseVCard(text, targetFolder)
      : { folderId: targetFolder, fullName: '', company: '', jobTitle: '', phone: '', email: '', website: '', comment: '', starred: false, photos: [], ocrText: text };
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

  if (!ready) return <div className="loading-screen">Загрузка CardVault…</div>;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Archive size={21} /></div>
          <div><strong>CardVault</strong><span>Электронная визитница</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
        </div>
        <nav className="folder-nav">
          <button className={view === 'vault' && selectedFolder === 'all' ? 'active' : ''} onClick={() => { setView('vault'); setSelectedFolder('all'); setSidebarOpen(false); }}>
            <span><Folder size={17} />Все визитки</span><b>{data.cards.length}</b>
          </button>
          <button className={`wallet-nav-button ${view === 'mycards' ? 'active' : ''}`} onClick={() => { setView('mycards'); setSidebarOpen(false); }}>
            <span><WalletCards size={17} />Мои визитки</span><b>{data.ownCards.length}</b>
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
        <div className="sidebar-note">
          <Settings2 size={17} />
          <p><strong>Локальное хранение.</strong> Данные сохраняются на этом устройстве. Для переноса используйте экспорт JSON.</p>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          {view === 'vault' ? (
            <div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя, компания, телефон, комментарий…" />{search && <button onClick={() => setSearch('')}><X size={16} /></button>}</div>
          ) : (
            <div className="topbar-title"><WalletCards size={18} /><span>Мои визитки</span></div>
          )}
          <div className="top-actions">
            <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(e) => void handleImport(e.target.files?.[0])} />
            <button className="secondary-button compact" onClick={() => setScannerOpen(true)} title="Сканировать QR визитки"><ScanLine size={17} /><span>Сканировать</span></button>
            {view === 'vault' ? (
              <>
                <div className="export-menu">
                  <button className="secondary-button compact"><Download size={17} /><span>Экспорт</span><ChevronDown size={14} /></button>
                  <div className="export-popover">
                    <button onClick={() => exportData(data)}><Download size={16} />Резервная копия JSON</button>
                    <button onClick={() => exportContactsCsv(data)}><Download size={16} />Контакты CSV</button>
                    <button onClick={() => importRef.current?.click()}><Upload size={16} />Импорт JSON</button>
                  </div>
                </div>
                <button className="primary-button" onClick={() => { setEditingCard(null); setPendingDraft(null); setEditorOpen(true); }}><Plus size={18} /><span>Добавить визитку</span></button>
              </>
            ) : (
              <button className="primary-button" onClick={() => { setEditingOwnCard(null); setOwnEditorOpen(true); }}><Plus size={18} /><span>Новая визитка</span></button>
            )}
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
        <section className="content">
          <div className="content-heading">
            <div><span className="eyebrow">Каталог</span><h1>{selectedFolderName}</h1><p>{visibleCards.length} {visibleCards.length === 1 ? 'контакт' : 'контактов'} · важные визитки показываются первыми</p></div>
            <button className="mobile-add primary-button" onClick={() => { setEditingCard(null); setPendingDraft(null); setEditorOpen(true); }}><Plus size={18} />Добавить</button>
          </div>

          {visibleCards.length === 0 ? (
            <div className="empty-state"><div className="empty-icon"><Archive size={34} /></div><h2>{search ? 'Ничего не найдено' : 'Пока нет визиток'}</h2><p>{search ? 'Измените поисковый запрос или выберите другую папку.' : 'Добавьте фотографию визитки. OCR распознает текст, а перед сохранением вы сможете проверить поля.'}</p>{!search && <button className="primary-button" onClick={() => setEditorOpen(true)}><Plus size={18} />Добавить первую визитку</button>}</div>
          ) : (
            <div className="card-grid">
              {visibleCards.map((card) => (
                <BusinessCardView
                  key={card.id}
                  card={card}
                  folderName={data.folders.find((folder) => folder.id === card.folderId)?.name ?? 'Без категории'}
                  onToggleStar={() => toggleStar(card.id)}
                  onEdit={() => { setEditingCard(card); setEditorOpen(true); }}
                  onDelete={() => deleteCard(card.id)}
                  onExportVCard={() => downloadVCard(card)}
                />
              ))}
            </div>
          )}
        </section>
        )}
      </main>

      <CardEditor
        open={editorOpen}
        folders={data.folders}
        card={editingCard}
        initialDraft={pendingDraft}
        initialFolderId={selectedFolder === 'all' ? undefined : selectedFolder}
        ocrLanguage={data.settings.ocrLanguage}
        onClose={() => { setEditorOpen(false); setEditingCard(null); setPendingDraft(null); }}
        onSave={saveCard}
      />
      <OwnCardEditor open={ownEditorOpen} card={editingOwnCard} onClose={() => { setOwnEditorOpen(false); setEditingOwnCard(null); }} onSave={saveOwnCard} />
      <CardPresent card={presentingCard} onClose={() => setPresentingCard(null)} />
      <QrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDecoded={handleScanned} />
    </div>
  );
}
