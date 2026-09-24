import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SPEECH_TABS, SPEECH_TYPES } from './data';
import { AutoGrowTextarea, Badge, Confirm, Empty, Segmented, Spinner, dateLabel, displayName, plain } from './ui';
import { Icon } from './icons';

function SpeechCard({ item, onOpen }) {
  return <button className="speech-card" onClick={() => onOpen(item)}><span className={`speech-dot ${item.isPublic ? 'public' : ''}`} /><div><span className="eyebrow">{item.tipo}</span><h3>{item.tema}</h3><p>{item.fonte || 'Fonte não informada'}</p></div><div className="speech-card-meta"><span>{dateLabel(item.createdAt)}</span><Icon name="chevron" size={18} /></div></button>;
}

function SpeechFolders({ speeches, onSelect }) {
  const counts = useMemo(() => Object.fromEntries(SPEECH_TYPES.map((type) => [type, speeches.filter((item) => item.tipo === type).length])), [speeches]);
  return <div className="page-stack"><div className="section-heading"><div><span className="kicker">Seu arquivo</span><h1>Discursos</h1><p>Anotações organizadas por ocasião e formato.</p></div><span className="count-pill">{speeches.length}</span></div><div className="folder-grid">{SPEECH_TYPES.map((type) => <button key={type} onClick={() => onSelect(type)} className={counts[type] ? 'has-content' : ''}><span className="folder-icon"><Icon name="folder" size={26} /></span><h3>{type}</h3><p>{counts[type]} {counts[type] === 1 ? 'discurso' : 'discursos'}</p><Icon name="chevron" size={18} /></button>)}</div></div>;
}

function SpeechList({ type, speeches, onBack, onOpen }) {
  const items = speeches.filter((item) => item.tipo === type);
  return <div className="page-stack"><button className="back-button" onClick={onBack}><Icon name="back" size={18} />Todas as categorias</button><div className="section-heading"><div><span className="kicker">Categoria</span><h1>{type}</h1></div><span className="count-pill">{items.length}</span></div><div className="speech-list">{items.map((item) => <SpeechCard key={`${item.path}/${item.id}`} item={item} onOpen={onOpen} />)}{items.length === 0 && <Empty icon="folder" title="Pasta vazia">Adicione uma anotação para esta categoria.</Empty>}</div></div>;
}

function SpeechDetail({ item, user, onBack, onEdit, onDelete }) {
  const isOwner = item.autorId === user.uid || item.userId === user.uid;
  return <div className="page-stack"><button className="back-button" onClick={onBack}><Icon name="back" size={18} />Voltar para {item.tipo}</button><article className="panel speech-detail"><header><div><span className="kicker">{item.tipo}</span><h1>{item.tema}</h1></div><Badge isPublic={item.isPublic} /></header>{item.fonte && <div className="source-box"><span>Fonte ou texto-base</span><strong>{item.fonte}</strong></div>}<div className="speech-notes">{item.anotacao}</div><footer><div><span>Salvo em {dateLabel(item.createdAt)}</span>{item.authorName && <span> · por {item.authorName}</span>}</div>{isOwner && <div className="detail-actions"><button className="button secondary" onClick={() => onEdit(item)}><Icon name="edit" size={17} />Editar</button><button className="button danger-soft" onClick={() => onDelete(item)}><Icon name="trash" size={17} />Excluir</button></div>}</footer></article></div>;
}

function SpeechForm({ data, user, editing, onDone, notify }) {
  const [visibility, setVisibility] = useState(editing?.isPublic === false ? 'private' : 'public'); const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget);
    const values = { tipo: form.get('tipo'), tema: form.get('tema').trim(), fonte: form.get('fonte').trim(), anotacao: form.get('anotacao').trim(), visibility, autorId: user.uid, authorName: displayName(user.email) };
    const nextPath = visibility === 'public' ? data.paths.publicSpeeches : data.paths.privateSpeeches;
    try {
      if (editing) {
        if (editing.path !== nextPath) { await addDoc(collection(db, nextPath), { ...values, createdAt: editing.createdAt || serverTimestamp() }); await deleteDoc(doc(db, editing.path, editing.id)); }
        else await updateDoc(doc(db, editing.path, editing.id), values);
        notify('Discurso atualizado.');
      } else { await addDoc(collection(db, nextPath), { ...values, createdAt: serverTimestamp() }); notify('Discurso salvo.'); }
      onDone(values.tipo);
    } catch (error) { console.error(error); notify('Não foi possível salvar. Confira sua conexão.', 'error'); setBusy(false); }
  };
  return <div className="form-page"><span className="kicker">{editing ? 'Edição' : 'Nova anotação'}</span><h1>{editing ? 'Editar discurso' : 'Registrar discurso'}</h1><p>Guarde pontos principais, referências e ideias para consultar depois.</p><form className="panel form-card" onSubmit={submit}><label>Categoria<select name="tipo" defaultValue={editing?.tipo || ''} required><option value="">Selecione</option>{SPEECH_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>Tema<input name="tema" defaultValue={editing?.tema || ''} placeholder="Ex.: O amor nunca acaba" required /></label><label>Fonte ou texto-base <span className="optional">opcional</span><input name="fonte" defaultValue={editing?.fonte || ''} placeholder="Orador, publicação, texto ou link" /></label><label>Anotações<AutoGrowTextarea name="anotacao" rows="10" defaultValue={editing?.anotacao || ''} placeholder="Escreva os pontos principais…" required /></label><div><span className="field-label">Visibilidade</span><Segmented value={visibility} onChange={setVisibility} label="Visibilidade" options={[["public", 'Público'], ['private', 'Privado']]} /></div><div className="form-actions">{editing && <button type="button" className="button secondary" onClick={() => onDone()}>Cancelar</button>}<button className="button primary" disabled={busy}>{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar discurso'}</button></div></form></div>;
}

function SearchSpeeches({ speeches, onOpen }) {
  const [term, setTerm] = useState(''); const normalized = plain(term.trim());
  const results = useMemo(() => normalized ? speeches.filter((item) => plain(`${item.tema} ${item.tipo} ${item.fonte} ${item.anotacao}`).includes(normalized)) : [], [normalized, speeches]);
  return <div className="form-page search-page"><span className="kicker">Busca local</span><h1>Pesquisar discursos</h1><p>Encontre uma ideia em temas, fontes ou anotações já sincronizadas.</p><label className="search-box"><Icon name="search" /><input value={term} onChange={(event) => setTerm(event.target.value)} type="search" placeholder="Digite uma palavra-chave…" autoFocus /></label><div className="search-summary">{normalized ? `${results.length} resultado${results.length === 1 ? '' : 's'}` : 'Comece digitando para pesquisar'}</div><div className="speech-list">{results.map((item) => <SpeechCard key={`${item.path}/${item.id}`} item={item} onOpen={onOpen} />)}{normalized && results.length === 0 && <Empty icon="search" title="Nada encontrado">Tente pesquisar por outro termo.</Empty>}</div></div>;
}

export default function Speeches({ data, user, tab, setTab, notify }) {
  const [type, setType] = useState(null); const [selected, setSelected] = useState(null); const [editing, setEditing] = useState(null); const [deleting, setDeleting] = useState(null); const [busy, setBusy] = useState(false);
  const open = (item) => { setSelected(item); setType(item.tipo); setTab('discursos'); };
  const afterSave = (savedType) => { setEditing(null); if (savedType) { setType(savedType); setSelected(null); setTab('discursos'); } };
  const remove = async () => { setBusy(true); try { await deleteDoc(doc(db, deleting.path, deleting.id)); notify('Discurso excluído.'); setDeleting(null); setSelected(null); } catch (error) { console.error(error); notify('Não foi possível excluir.', 'error'); } finally { setBusy(false); } };
  let content;
  if (data.loading) content = <Spinner label="Sincronizando discursos…" />;
  else if (tab === 'adicionar') content = <SpeechForm key={editing ? `${editing.path}/${editing.id}` : 'new'} data={data} user={user} editing={editing} onDone={afterSave} notify={notify} />;
  else if (tab === 'buscar') content = <SearchSpeeches speeches={data.speeches} onOpen={open} />;
  else if (selected) content = <SpeechDetail item={selected} user={user} onBack={() => setSelected(null)} onEdit={(item) => { setEditing(item); setTab('adicionar'); }} onDelete={setDeleting} />;
  else if (type) content = <SpeechList type={type} speeches={data.speeches} onBack={() => setType(null)} onOpen={open} />;
  else content = <SpeechFolders speeches={data.speeches} onSelect={setType} />;
  return <><div className="content-shell">{content}</div>{deleting && <Confirm title="Excluir este discurso?" busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}>A anotação será removida permanentemente.</Confirm>}</>;
}

export { SPEECH_TABS };
