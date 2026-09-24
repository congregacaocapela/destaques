import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { ALL_BOOKS, BIBLE, CHAPTER_COUNTS, STUDY_TABS, TOTAL_CHAPTERS } from './data';
import { AutoGrowTextarea, Badge, Confirm, Empty, ItemActions, Modal, Segmented, Spinner, dateLabel, displayName, plain } from './ui';
import { Icon } from './icons';

const safeUrl = (value) => /^https?:\/\//i.test(value || '') ? value : null;

function calculateProgress(items) {
  const chapters = new Set(items.filter((item) => item.livro && item.capitulo).map((item) => `${item.livro}:${item.capitulo}`));
  const completedBooks = ALL_BOOKS.filter((book) => {
    let complete = 0;
    for (let chapter = 1; chapter <= CHAPTER_COUNTS[book]; chapter += 1) if (chapters.has(`${book}:${chapter}`)) complete += 1;
    return complete === CHAPTER_COUNTS[book];
  }).length;
  return {
    chapters: chapters.size,
    books: completedBooks,
    chapterPercent: (chapters.size / TOTAL_CHAPTERS) * 100,
    bookPercent: (completedBooks / ALL_BOOKS.length) * 100,
  };
}

function ProgressBar({ label, value, detail, tone = 'green' }) {
  return <div className="progress-block"><div className="progress-label"><span>{label}</span><strong>{detail}</strong></div><div className="progress-track"><span className={tone} style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

function HighlightCard({ item, user, onEdit, onDelete, compact = false, onOpen }) {
  return <article className={`content-card ${compact ? 'compact' : ''}`} onClick={onOpen}>
    <div className="card-topline"><span className="eyebrow">{item.livro} {item.capitulo}:{item.versiculo}</span><Badge isPublic={item.isPublic} /></div>
    <p className="card-text">{item.texto}</p>
    <footer><span>{item.autorEmail ? displayName(item.autorEmail) : 'Anônimo'} · {dateLabel(item.createdAt)}</span><ItemActions item={item} user={user} onEdit={onEdit} onDelete={onDelete} /></footer>
  </article>;
}

function ResearchCard({ item, user, onEdit, onDelete, compact = false }) {
  const source = safeUrl(item.fonte);
  return <article className={`content-card research-card ${compact ? 'compact' : ''}`}>
    <div className="card-topline"><span className="eyebrow">Pesquisa</span><Badge isPublic={item.isPublic} /></div>
    <h3>{item.titulo}</h3>
    {item.textoBiblico && <blockquote>{item.textoBiblico}</blockquote>}
    <p className="card-text">{item.anotacoes}</p>
    {item.tags?.length > 0 && <div className="tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
    <footer><span>{dateLabel(item.createdAt)}{source && <> · <a href={source} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Abrir fonte <Icon name="external" size={13} /></a></>}</span><ItemActions item={item} user={user} onEdit={onEdit} onDelete={onDelete} /></footer>
  </article>;
}

function Dashboard({ data, user, setTab, onEdit, onDelete }) {
  const publicHighlights = data.highlights.filter((item) => item.isPublic);
  const ownHighlights = data.highlights.filter((item) => !item.isPublic || item.autorId === user.uid);
  const publicResearch = data.research.filter((item) => item.isPublic);
  const ownResearch = data.research.filter((item) => !item.isPublic || item.autorId === user.uid);
  const publicProgress = calculateProgress(publicHighlights);
  const ownProgress = calculateProgress(ownHighlights);
  return <div className="page-stack">
    <section className="hero-panel">
      <div><span className="kicker">Seu espaço de estudo</span><h1>Olá, {displayName(user.email)}.</h1><p>Continue registrando o que encontrou de valioso na sua leitura.</p></div>
      <button className="button primary" onClick={() => setTab('adicionar')}><Icon name="plus" size={18} />Nova anotação</button>
    </section>
    <section><div className="section-heading"><div><span className="kicker">Visão geral</span><h2>Progresso da leitura</h2></div></div>
      <div className="progress-grid">
        <article className="panel progress-card"><div className="panel-heading"><div><span className="avatar small">{displayName(user.email)[0]}</span><div><h3>Meu progresso</h3><p>Itens públicos e privados</p></div></div><strong>{ownHighlights.length} joias</strong></div><ProgressBar label="Capítulos explorados" value={ownProgress.chapterPercent} detail={`${ownProgress.chapters} de ${TOTAL_CHAPTERS}`} /><ProgressBar label="Livros completos" value={ownProgress.bookPercent} detail={`${ownProgress.books} de ${ALL_BOOKS.length}`} tone="gold" /></article>
        <article className="panel progress-card"><div className="panel-heading"><div><span className="avatar small community"><Icon name="globe" size={17} /></span><div><h3>Geral</h3><p>Progresso público</p></div></div><strong>{publicHighlights.length} joias</strong></div><ProgressBar label="Capítulos explorados" value={publicProgress.chapterPercent} detail={`${publicProgress.chapters} de ${TOTAL_CHAPTERS}`} /><ProgressBar label="Livros completos" value={publicProgress.bookPercent} detail={`${publicProgress.books} de ${ALL_BOOKS.length}`} tone="gold" /></article>
      </div>
      <div className="stat-row"><article><span>Suas pesquisas</span><strong>{ownResearch.length}</strong></article><article><span>Pesquisas públicas</span><strong>{publicResearch.length}</strong></article><article><span>Capítulos da Bíblia</span><strong>{TOTAL_CHAPTERS}</strong></article></div>
    </section>
    <section><div className="section-heading"><div><span className="kicker">Mais recentes</span><h2>Últimas joias</h2></div><button className="text-button" onClick={() => setTab('livros')}>Ver Bíblia <Icon name="chevron" size={16} /></button></div><div className="card-grid two">{data.highlights.slice(0, 4).map((item) => <HighlightCard key={`${item.path}/${item.id}`} item={item} user={user} onEdit={onEdit} onDelete={onDelete} compact />)}{data.highlights.length === 0 && <Empty icon="book" title="Nenhuma joia ainda">Sua primeira descoberta aparecerá aqui.</Empty>}</div></section>
  </div>;
}

function Library({ data, user, onEdit, onDelete }) {
  const [scope, setScope] = useState('publico');
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const visible = useMemo(() => data.highlights.filter((item) => scope === 'publico' ? item.isPublic : (!item.isPublic || item.autorId === user.uid)), [data.highlights, scope, user.uid]);
  const progress = useMemo(() => {
    const map = {};
    visible.forEach((item) => { if (item.livro && item.capitulo) (map[item.livro] ||= new Set()).add(Number(item.capitulo)); });
    return map;
  }, [visible]);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [book, chapter]);
  if (book && chapter) {
    const items = visible.filter((item) => item.livro === book && Number(item.capitulo) === chapter);
    const totalChapters = CHAPTER_COUNTS[book];
    return <div className="page-stack"><button className="back-button" onClick={() => setChapter(null)}><Icon name="back" size={18} />Capítulos de {book}</button><div className="book-title-row chapter-title-row"><button className="icon-button" disabled={chapter === 1} onClick={() => setChapter((current) => current - 1)} aria-label="Capítulo anterior"><Icon name="back" /></button><div><span className="kicker">{book}</span><h1>Capítulo {chapter}</h1><p>{items.length} {items.length === 1 ? 'joia' : 'joias'}</p></div><button className="icon-button next" disabled={chapter === totalChapters} onClick={() => setChapter((current) => current + 1)} aria-label="Próximo capítulo"><Icon name="chevron" /></button></div><div className="card-grid">{items.map((item) => <HighlightCard key={`${item.path}/${item.id}`} item={item} user={user} onEdit={onEdit} onDelete={onDelete} />)}{items.length === 0 && <Empty icon="book" title="Capítulo ainda sem joias">Registre uma descoberta na aba Adicionar.</Empty>}</div></div>;
  }
  if (book) {
    const index = ALL_BOOKS.indexOf(book);
    return <div className="page-stack"><button className="back-button" onClick={() => setBook(null)}><Icon name="back" size={18} />Todos os livros</button><div className="book-title-row"><button className="icon-button" disabled={index === 0} onClick={() => setBook(ALL_BOOKS[index - 1])}><Icon name="back" /></button><div><span className="kicker">Livro bíblico</span><h1>{book}</h1><p>{progress[book]?.size || 0} de {CHAPTER_COUNTS[book]} capítulos explorados</p></div><button className="icon-button next" disabled={index === ALL_BOOKS.length - 1} onClick={() => setBook(ALL_BOOKS[index + 1])}><Icon name="chevron" /></button></div><div className="chapter-grid">{Array.from({ length: CHAPTER_COUNTS[book] }, (_, i) => i + 1).map((number) => <button key={number} className={progress[book]?.has(number) ? 'complete' : ''} onClick={() => setChapter(number)}><span>{number}</span>{progress[book]?.has(number) && <small>com joia</small>}</button>)}</div></div>;
  }
  return <div className="page-stack"><div className="section-heading responsive"><div><span className="kicker">Biblioteca</span><h1>Livros da Bíblia</h1><p>{scope === 'publico' ? 'Progresso geral com todas as joias públicas.' : 'Somente o seu progresso, incluindo joias privadas.'}</p></div><button type="button" className="button secondary progress-toggle" onClick={() => setScope((current) => current === 'publico' ? 'individual' : 'publico')}><Icon name={scope === 'publico' ? 'user' : 'globe'} size={17} />{scope === 'publico' ? 'Mostrar somente meu progresso' : 'Mostrar progresso geral'}</button></div>{Object.entries(BIBLE).map(([testament, books]) => <section key={testament}><div className="section-heading compact"><h2>{testament}</h2><span>{Object.keys(books).length} livros</span></div><div className="book-grid">{Object.entries(books).map(([name, total]) => { const done = progress[name]?.size || 0; return <button key={name} onClick={() => setBook(name)} className={done ? 'has-progress' : ''}><span className="book-name">{name}</span><span className="book-count">{done}/{total}</span><span className="book-progress"><i style={{ width: `${(done / total) * 100}%` }} /></span></button>; })}</div></section>)}</div>;
}

function AddStudy({ data, user, notify }) {
  const [type, setType] = useState('joia');
  const [book, setBook] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (type === 'joia') {
        const visibility = form.get('visibility');
        await addDoc(collection(db, visibility === 'public' ? data.paths.publicHighlights : data.paths.privateHighlights), { autorEmail: user.email, autorId: user.uid, livro: form.get('livro'), capitulo: Number(form.get('capitulo')), versiculo: form.get('versiculo').trim(), texto: form.get('texto').trim(), visibility, createdAt: serverTimestamp() });
        setBook('');
      } else {
        const visibility = form.get('visibility');
        await addDoc(collection(db, visibility === 'public' ? data.paths.publicResearch : data.paths.privateResearch), { autorEmail: user.email, autorId: user.uid, titulo: form.get('titulo').trim(), tags: form.get('tags').split(',').map((tag) => tag.trim()).filter(Boolean), fonte: form.get('fonte').trim(), textoBiblico: form.get('textoBiblico').trim(), anotacoes: form.get('anotacoes').trim(), visibility, createdAt: serverTimestamp() });
      }
      event.currentTarget.reset(); notify(`${type === 'joia' ? 'Joia' : 'Pesquisa'} salva com sucesso.`);
    } catch (error) { console.error(error); notify('Não foi possível salvar. Confira sua conexão.', 'error'); }
    finally { setBusy(false); }
  };
  return <div className="form-page"><span className="kicker">Novo conteúdo</span><h1>O que você quer registrar?</h1><p>Salve de forma organizada para encontrar com facilidade depois.</p><Segmented value={type} onChange={setType} label="Tipo de conteúdo" options={[["joia", 'Joia espiritual'], ['pesquisa', 'Pesquisa']]} /><form className="panel form-card" onSubmit={submit}>{type === 'joia' ? <><div className="form-grid"><label>Livro<select name="livro" value={book} onChange={(event) => setBook(event.target.value)} required><option value="">Selecione</option>{ALL_BOOKS.map((name) => <option key={name}>{name}</option>)}</select></label><label>Capítulo<select name="capitulo" disabled={!book} required><option value="">Selecione</option>{book && Array.from({ length: CHAPTER_COUNTS[book] }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></label></div><label>Versículo(s)<input name="versiculo" placeholder="Ex.: 5, 6 ou 5–7" required /></label><label>Sua joia<AutoGrowTextarea name="texto" rows="7" placeholder="O que chamou sua atenção?" required /></label></> : <><label>Título<input name="titulo" placeholder="Tema da pesquisa" required /></label><div className="form-grid"><label>Tags<input name="tags" placeholder="fé, oração, família" /></label><label>Fonte<input name="fonte" type="url" placeholder="https://…" /></label></div><label>Texto bíblico <span className="optional">opcional</span><textarea name="textoBiblico" rows="3" /></label><label>Anotações<AutoGrowTextarea name="anotacoes" rows="8" placeholder="Organize aqui suas conclusões…" required /></label></>}<fieldset><legend>Visibilidade</legend><div className="radio-cards"><label><input type="radio" name="visibility" value="public" defaultChecked /><span><Icon name="globe" /><b>Público</b><small>Visível para todos</small></span></label><label><input type="radio" name="visibility" value="private" /><span><Icon name="lock" /><b>Privado</b><small>Somente na sua conta</small></span></label></div></fieldset><button className="button primary full" disabled={busy}>{busy ? 'Salvando…' : `Salvar ${type === 'joia' ? 'joia' : 'pesquisa'}`}</button></form></div>;
}

function ResearchList({ data, user, onEdit, onDelete }) {
  const [visible, setVisible] = useState(8);
  return <div className="page-stack"><div className="section-heading"><div><span className="kicker">Acervo</span><h1>Pesquisas</h1><p>Estudos reunidos por você e pelo acervo geral.</p></div><span className="count-pill">{data.research.length}</span></div><div className="card-grid">{data.research.slice(0, visible).map((item) => <ResearchCard key={`${item.path}/${item.id}`} item={item} user={user} onEdit={onEdit} onDelete={onDelete} />)}{data.research.length === 0 && <Empty title="Nenhuma pesquisa ainda">As pesquisas salvas aparecerão aqui.</Empty>}</div>{visible < data.research.length && <button className="button secondary load-more" onClick={() => setVisible((count) => count + 8)}>Mostrar mais</button>}</div>;
}

function SearchStudy({ data, user, onEdit, onDelete }) {
  const [type, setType] = useState('joias'); const [term, setTerm] = useState(''); const normalized = plain(term.trim());
  const items = useMemo(() => normalized ? (type === 'joias' ? data.highlights.filter((item) => plain(`${item.livro} ${item.capitulo} ${item.versiculo} ${item.texto}`).includes(normalized)) : data.research.filter((item) => plain(`${item.titulo} ${item.anotacoes} ${item.textoBiblico} ${(item.tags || []).join(' ')}`).includes(normalized))) : [], [data, normalized, type]);
  return <div className="form-page search-page"><span className="kicker">Busca unificada</span><h1>Encontre o que precisa</h1><p>A pesquisa acontece nos dados já carregados, sem gastar internet extra.</p><Segmented value={type} onChange={setType} label="Pesquisar em" options={[["joias", 'Joias'], ['pesquisas', 'Pesquisas']]} /><label className="search-box"><Icon name="search" /><input value={term} onChange={(event) => setTerm(event.target.value)} type="search" placeholder="Digite uma palavra-chave…" autoFocus /></label><div className="search-summary">{normalized ? `${items.length} resultado${items.length === 1 ? '' : 's'}` : 'Comece digitando para pesquisar'}</div><div className="card-grid">{items.map((item) => type === 'joias' ? <HighlightCard key={`${item.path}/${item.id}`} item={item} user={user} onEdit={onEdit} onDelete={onDelete} /> : <ResearchCard key={`${item.path}/${item.id}`} item={item} user={user} onEdit={onEdit} onDelete={onDelete} />)}{normalized && items.length === 0 && <Empty icon="search" title="Nada encontrado">Tente uma palavra diferente ou altere o tipo de conteúdo.</Empty>}</div></div>;
}

function EditVisibility({ isPublic }) {
  return <fieldset><legend>Visibilidade</legend><div className="radio-cards">
    <label><input type="radio" name="visibility" value="public" defaultChecked={isPublic} /><span><Icon name="globe" /><b>Público</b><small>Visível para todos</small></span></label>
    <label><input type="radio" name="visibility" value="private" defaultChecked={!isPublic} /><span><Icon name="lock" /><b>Privado</b><small>Somente na sua conta</small></span></label>
  </div></fieldset>;
}

function EditStudy({ item, data, onClose, notify }) {
  const isHighlight = item.path.includes('destaques');
  const [busy, setBusy] = useState(false);
  const [book, setBook] = useState(item.livro || '');
  const [chapter, setChapter] = useState(String(item.capitulo || ''));

  const changeBook = (event) => {
    const nextBook = event.target.value;
    setBook(nextBook);
    if (!nextBook || Number(chapter) > CHAPTER_COUNTS[nextBook]) setChapter('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const visibility = form.get('visibility');
    try {
      const values = isHighlight ? {
        livro: form.get('livro'),
        capitulo: Number(form.get('capitulo')),
        versiculo: form.get('versiculo').trim(),
        texto: form.get('texto').trim(),
        visibility,
      } : {
        titulo: form.get('titulo').trim(),
        tags: form.get('tags').split(',').map((tag) => tag.trim()).filter(Boolean),
        fonte: form.get('fonte').trim(),
        textoBiblico: form.get('textoBiblico').trim(),
        anotacoes: form.get('anotacoes').trim(),
        visibility,
      };
      const targetPath = isHighlight
        ? (visibility === 'public' ? data.paths.publicHighlights : data.paths.privateHighlights)
        : (visibility === 'public' ? data.paths.publicResearch : data.paths.privateResearch);

      if (targetPath === item.path) {
        await updateDoc(doc(db, item.path, item.id), values);
      } else {
        const { id, path, isPublic, ...storedValues } = item;
        const batch = writeBatch(db);
        batch.set(doc(db, targetPath, item.id), { ...storedValues, ...values });
        batch.delete(doc(db, path, id));
        await batch.commit();
      }
      notify('Alterações salvas.');
      onClose();
    } catch (error) {
      console.error(error);
      notify('Não foi possível atualizar.', 'error');
      setBusy(false);
    }
  };

  return <Modal title={isHighlight ? 'Editar joia' : 'Editar pesquisa'} onClose={onClose} wide><form className="modal-form" onSubmit={submit}>
    {isHighlight ? <>
      <div className="form-grid">
        <label>Livro<select name="livro" value={book} onChange={changeBook} required><option value="">Selecione</option>{ALL_BOOKS.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Capítulo<select name="capitulo" value={chapter} onChange={(event) => setChapter(event.target.value)} disabled={!book} required><option value="">Selecione</option>{book && Array.from({ length: CHAPTER_COUNTS[book] }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>
      </div>
      <label>Versículo(s)<input name="versiculo" defaultValue={item.versiculo} required /></label>
      <label>Joia<AutoGrowTextarea name="texto" rows="7" defaultValue={item.texto} required /></label>
    </> : <>
      <label>Título<input name="titulo" defaultValue={item.titulo} required /></label>
      <label>Tags<input name="tags" defaultValue={(item.tags || []).join(', ')} /></label>
      <label>Fonte<input name="fonte" type="url" defaultValue={item.fonte} /></label>
      <label>Texto bíblico<AutoGrowTextarea name="textoBiblico" rows="3" defaultValue={item.textoBiblico} /></label>
      <label>Anotações<AutoGrowTextarea name="anotacoes" rows="7" defaultValue={item.anotacoes} required /></label>
    </>}
    <EditVisibility isPublic={item.isPublic} />
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
  </form></Modal>;
}

export default function Study({ data, user, tab, setTab, notify }) {
  const [editing, setEditing] = useState(null); const [deleting, setDeleting] = useState(null); const [busy, setBusy] = useState(false);
  const remove = async () => { setBusy(true); try { await deleteDoc(doc(db, deleting.path, deleting.id)); notify('Item excluído.'); setDeleting(null); } catch (error) { console.error(error); notify('Não foi possível excluir.', 'error'); } finally { setBusy(false); } };
  const common = { data, user, onEdit: setEditing, onDelete: setDeleting };
  return <><div className="content-shell">{data.loading ? <Spinner label="Sincronizando seu estudo…" /> : <>{tab === 'inicio' && <Dashboard {...common} setTab={setTab} />}{tab === 'livros' && <Library {...common} />}{tab === 'pesquisas' && <ResearchList {...common} />}{tab === 'adicionar' && <AddStudy data={data} user={user} notify={notify} />}{tab === 'buscar' && <SearchStudy {...common} />}</>}</div>{editing && <EditStudy item={editing} data={data} onClose={() => setEditing(null)} notify={notify} />}{deleting && <Confirm title="Excluir este item?" busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}>Essa ação é permanente e não poderá ser desfeita.</Confirm>}</>;
}

export { STUDY_TABS };
