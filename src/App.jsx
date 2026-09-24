import { useCallback, useEffect, useRef, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth, useSpeechData, useStudyData, useTheme } from './hooks';
import { Icon } from './icons';
import Study, { STUDY_TABS } from './Study';
import Speeches, { SPEECH_TABS } from './Speeches';
import { Notice, Spinner, Tabs, displayName } from './ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}icons/icon-192.png`;

function BrandLogo() {
  return <span className="brand-mark"><img src={LOGO_SRC} alt="" /></span>;
}

function Login() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); try { await signInWithEmailAndPassword(auth, form.get('email'), form.get('password')); } catch (reason) { console.error(reason); setError('E-mail ou senha incorretos.'); setBusy(false); } };
  return <main className="login-page"><section className="login-story"><div className="brand light"><BrandLogo /><span>Estudo Pessoal</span></div><div className="login-copy"><span className="kicker light">Leia. Reflita. Preserve.</span><h1>Um lugar tranquilo para o que realmente importa.</h1><p>Organize joias espirituais, pesquisas e discursos — disponível sempre que você precisar.</p></div><div className="login-quote"><span>“A sabedoria é a coisa mais importante.”</span><small>Provérbios 4:7</small></div></section><section className="login-form-wrap"><form className="login-form" onSubmit={submit}><div className="brand mobile"><BrandLogo /><span>Estudo Pessoal</span></div><span className="kicker">Bem-vindo de volta</span><h2>Acesse sua biblioteca</h2><p>Entre para continuar de onde parou.</p><label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></label><label>Senha<input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button><small className="privacy-note"><Icon name="lock" size={14} />Sua sessão é protegida pelo Firebase.</small></form></section></main>;
}

function Header({ mode, setMode, user, dark, setDark, online }) {
  const [switcher, setSwitcher] = useState(false);
  const [profile, setProfile] = useState(false);
  const switcherButtonRef = useRef(null);
  const switcherMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (switcher
        && !switcherButtonRef.current?.contains(event.target)
        && !switcherMenuRef.current?.contains(event.target)) setSwitcher(false);
      if (profile
        && !profileButtonRef.current?.contains(event.target)
        && !profileMenuRef.current?.contains(event.target)) setProfile(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSwitcher(false);
        setProfile(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profile, switcher]);

  const toggleSwitcher = () => {
    setProfile(false);
    setSwitcher((open) => !open);
  };
  const toggleProfile = () => {
    setSwitcher(false);
    setProfile((open) => !open);
  };

  return <header className="app-header">
    <div className="header-inner">
      <button ref={switcherButtonRef} className="brand-button" onClick={toggleSwitcher} aria-expanded={switcher} aria-haspopup="menu">
        <BrandLogo />
        <span><small>{mode === 'study' ? 'Biblioteca pessoal' : 'Arquivo pessoal'}</small><b>{mode === 'study' ? 'Estudo Pessoal' : 'Discursos'}</b></span>
        <Icon name="chevron" size={16} />
      </button>
      <div className="header-actions">
        {!online && <span className="offline-pill"><Icon name="wifiOff" size={15} />Offline</span>}
        <button className="icon-button header-icon" onClick={() => setDark(!dark)} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}><Icon name={dark ? 'sun' : 'moon'} /></button>
        <button ref={profileButtonRef} className="avatar-button" onClick={toggleProfile} aria-expanded={profile} aria-haspopup="menu">{displayName(user.email)[0]}</button>
      </div>
    </div>
    {switcher && <div ref={switcherMenuRef} className="popover app-switcher" role="menu">
      <span>Alternar espaço</span>
      <button className={mode === 'study' ? 'active' : ''} onClick={() => { setMode('study'); setSwitcher(false); }}><Icon name="book" /><span><b>Estudo Pessoal</b><small>Joias e pesquisas</small></span></button>
      <button className={mode === 'speeches' ? 'active' : ''} onClick={() => { setMode('speeches'); setSwitcher(false); }}><Icon name="folder" /><span><b>Discursos</b><small>Anotações organizadas</small></span></button>
    </div>}
    {profile && <div ref={profileMenuRef} className="popover profile-menu" role="menu">
      <div><span className="avatar">{displayName(user.email)[0]}</span><p><b>{displayName(user.email)}</b><small>{user.email}</small></p></div>
      <button onClick={() => signOut(auth)}><Icon name="logout" size={18} />Sair da conta</button>
    </div>}
  </header>;
}

function Application({ user }) {
  const initialMode = new URLSearchParams(window.location.search).get('app') === 'discursos' ? 'speeches' : 'study';
  const [mode, setModeState] = useState(initialMode); const [studyTab, setStudyTab] = useState('inicio'); const [speechTab, setSpeechTab] = useState('discursos'); const [dark, setDark] = useTheme(); const [online, setOnline] = useState(navigator.onLine); const [notice, setNotice] = useState(null);
  const studyData = useStudyData(mode === 'study' ? user : null); const speechData = useSpeechData(mode === 'speeches' ? user : null);
  const notify = useCallback((message, type = 'success') => setNotice({ message, type, key: Date.now() }), []);
  const setMode = (next) => { setModeState(next); const url = new URL(window.location.href); if (next === 'speeches') url.searchParams.set('app', 'discursos'); else url.searchParams.delete('app'); window.history.replaceState({}, '', url); };
  useEffect(() => { const yes = () => setOnline(true); const no = () => setOnline(false); window.addEventListener('online', yes); window.addEventListener('offline', no); return () => { window.removeEventListener('online', yes); window.removeEventListener('offline', no); }; }, []);
  const tabs = mode === 'study' ? STUDY_TABS : SPEECH_TABS; const tab = mode === 'study' ? studyTab : speechTab; const setTab = mode === 'study' ? setStudyTab : setSpeechTab;
  return <div className="app"><Header mode={mode} setMode={setMode} user={user} dark={dark} setDark={setDark} online={online} /><Tabs tabs={tabs} value={tab} onChange={setTab} />{mode === 'study' ? <Study data={studyData} user={user} tab={studyTab} setTab={setStudyTab} notify={notify} /> : <Speeches data={speechData} user={user} tab={speechTab} setTab={setSpeechTab} notify={notify} />}<footer className="site-footer">Criado por Guilherme Almeida</footer><Notice notice={notice} onClear={() => setNotice(null)} /></div>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash"><BrandLogo /><Spinner label="Preparando sua biblioteca…" /></div>;
  return user ? <Application user={user} /> : <Login />;
}
