import { useCallback, useEffect, useRef, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword, updateProfile } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth, useSpeechData, useStudyData, useTheme } from './hooks';
import { Icon } from './icons';
import { uploadProfilePhoto } from './profile';
import Study, { STUDY_TABS } from './Study';
import Speeches, { SPEECH_TABS } from './Speeches';
import { Modal, Notice, Spinner, Tabs, displayName } from './ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}icons/icon-192.png`;

function BrandLogo() {
  return <span className="brand-mark"><img src={LOGO_SRC} alt="" /></span>;
}

function Login() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); try { await signInWithEmailAndPassword(auth, form.get('email'), form.get('password')); } catch (reason) { console.error(reason); setError('E-mail ou senha incorretos.'); setBusy(false); } };
  return <main className="login-page"><section className="login-story"><div className="brand light"><BrandLogo /><span>Estudo Pessoal</span></div><div className="login-copy"><span className="kicker light">Leia. Reflita. Preserve.</span><h1>Um lugar tranquilo para o que realmente importa.</h1><p>Organize joias espirituais, pesquisas e discursos — disponível sempre que você precisar.</p></div><div className="login-quote"><span>“A sabedoria é a coisa mais importante.”</span><small>Provérbios 4:7</small></div></section><section className="login-form-wrap"><form className="login-form" onSubmit={submit}><div className="brand mobile"><BrandLogo /><span>Estudo Pessoal</span></div><span className="kicker">Bem-vindo de volta</span><h2>Acesse sua biblioteca</h2><p>Entre para continuar de onde parou.</p><label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></label><label>Senha<input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button><small className="privacy-note"><Icon name="lock" size={14} />Sua sessão é protegida pelo Firebase.</small></form></section></main>;
}

function profileError(error, fallback) {
  if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') return 'A senha atual está incorreta.';
  if (error?.code === 'auth/weak-password') return 'A nova senha precisa ser mais forte.';
  if (error?.code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (error?.code === 'storage/unauthorized') return 'O Firebase Storage não autorizou o envio desta foto.';
  return error?.message || fallback;
}

function ProfileEditor({ user, photoURL, onPhotoSaved, onClose, notify }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const photoInputRef = useRef(null);
  const currentPhoto = preview || photoURL;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Escolha um arquivo de imagem.', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      notify('A foto original deve ter no máximo 12 MB.', 'error');
      event.target.value = '';
      return;
    }
    setSelectedPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const savePhoto = async () => {
    if (!selectedPhoto) return;
    setPhotoBusy(true);
    try {
      const downloadURL = await uploadProfilePhoto(user.uid, selectedPhoto);
      await updateProfile(user, { photoURL: downloadURL });
      onPhotoSaved(downloadURL);
      setSelectedPhoto(null);
      setPreview('');
      if (photoInputRef.current) photoInputRef.current.value = '';
      notify('Foto do perfil atualizada.');
    } catch (error) {
      console.error(error);
      notify(profileError(error, 'Não foi possível salvar a foto.'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = form.get('currentPassword');
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    if (newPassword !== confirmPassword) {
      notify('A confirmação não corresponde à nova senha.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      notify('A nova senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }
    setPasswordBusy(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      event.currentTarget.reset();
      notify('Senha alterada com segurança.');
    } catch (error) {
      console.error(error);
      notify(profileError(error, 'Não foi possível alterar a senha.'), 'error');
    } finally {
      setPasswordBusy(false);
    }
  };

  return <Modal title="Meu perfil" onClose={onClose} wide><div className="profile-editor">
    <section className="profile-identity">
      <span className={`profile-photo-preview ${currentPhoto ? 'has-photo' : ''}`}>{currentPhoto ? <img src={currentPhoto} alt="Sua foto de perfil" /> : displayName(user.email)[0]}</span>
      <div><h3>{displayName(user.email)}</h3><p>{user.email}</p></div>
    </section>
    <section className="profile-section">
      <div className="profile-section-heading"><div><h3>Foto do perfil</h3><p>Será recortada em formato quadrado e otimizada para economizar dados.</p></div></div>
      <div className="profile-photo-actions">
        <label className="button secondary file-button"><Icon name="image" size={17} />Escolher foto<input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={choosePhoto} /></label>
        {selectedPhoto && <button type="button" className="button primary" disabled={photoBusy} onClick={savePhoto}>{photoBusy ? 'Enviando…' : 'Salvar foto'}</button>}
      </div>
      {selectedPhoto && <small className="selected-file">{selectedPhoto.name}</small>}
    </section>
    <form className="profile-section password-form" onSubmit={changePassword}>
      <div className="profile-section-heading"><div><h3>Alterar senha</h3><p>Confirme sua senha atual antes de definir uma nova.</p></div><Icon name="lock" size={20} /></div>
      <label>Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <div className="form-grid">
        <label>Nova senha<input name="newPassword" type="password" autoComplete="new-password" minLength="8" required /></label>
        <label>Confirmar nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" required /></label>
      </div>
      <button className="button secondary password-button" disabled={passwordBusy}>{passwordBusy ? 'Alterando…' : 'Alterar senha'}</button>
    </form>
  </div></Modal>;
}

function Header({ mode, setMode, user, dark, setDark, online, notify }) {
  const [switcher, setSwitcher] = useState(false);
  const [profile, setProfile] = useState(false);
  const [profileEditor, setProfileEditor] = useState(false);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
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

  return <><header className="app-header">
    <div className="header-inner">
      <button ref={switcherButtonRef} className="brand-button" onClick={toggleSwitcher} aria-expanded={switcher} aria-haspopup="menu">
        <BrandLogo />
        <span><small>{mode === 'study' ? 'Biblioteca pessoal' : 'Arquivo pessoal'}</small><b>{mode === 'study' ? 'Estudo Pessoal' : 'Discursos'}</b></span>
        <Icon name="chevron" size={16} />
      </button>
      <div className="header-actions">
        {!online && <span className="offline-pill"><Icon name="wifiOff" size={15} />Offline</span>}
        <button className="icon-button header-icon" onClick={() => setDark(!dark)} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}><Icon name={dark ? 'sun' : 'moon'} /></button>
        <button ref={profileButtonRef} className={`avatar-button ${photoURL ? 'has-photo' : ''}`} onClick={toggleProfile} aria-label="Abrir menu do perfil" aria-expanded={profile} aria-haspopup="menu">{photoURL ? <img src={photoURL} alt="" /> : displayName(user.email)[0]}</button>
      </div>
    </div>
    {switcher && <div ref={switcherMenuRef} className="popover app-switcher" role="menu">
      <span>Alternar espaço</span>
      <button className={mode === 'study' ? 'active' : ''} onClick={() => { setMode('study'); setSwitcher(false); }}><Icon name="book" /><span><b>Estudo Pessoal</b><small>Joias e pesquisas</small></span></button>
      <button className={mode === 'speeches' ? 'active' : ''} onClick={() => { setMode('speeches'); setSwitcher(false); }}><Icon name="folder" /><span><b>Discursos</b><small>Anotações organizadas</small></span></button>
    </div>}
    {profile && <div ref={profileMenuRef} className="popover profile-menu" role="menu">
      <div><span className={`avatar ${photoURL ? 'has-photo' : ''}`}>{photoURL ? <img src={photoURL} alt="" /> : displayName(user.email)[0]}</span><p><b>{displayName(user.email)}</b><small>{user.email}</small></p></div>
      <button onClick={() => { setProfile(false); setProfileEditor(true); }}><Icon name="user" size={18} />Meu perfil</button>
      <button className="logout" onClick={() => signOut(auth)}><Icon name="logout" size={18} />Sair da conta</button>
    </div>}
  </header>{profileEditor && <ProfileEditor user={user} photoURL={photoURL} onPhotoSaved={setPhotoURL} onClose={() => setProfileEditor(false)} notify={notify} />}</>;
}

function Application({ user }) {
  const initialMode = new URLSearchParams(window.location.search).get('app') === 'discursos' ? 'speeches' : 'study';
  const [mode, setModeState] = useState(initialMode); const [studyTab, setStudyTab] = useState('inicio'); const [speechTab, setSpeechTab] = useState('discursos'); const [dark, setDark] = useTheme(); const [online, setOnline] = useState(navigator.onLine); const [notice, setNotice] = useState(null);
  const studyData = useStudyData(mode === 'study' ? user : null); const speechData = useSpeechData(mode === 'speeches' ? user : null);
  const notify = useCallback((message, type = 'success') => setNotice({ message, type, key: Date.now() }), []);
  const setMode = (next) => { setModeState(next); const url = new URL(window.location.href); if (next === 'speeches') url.searchParams.set('app', 'discursos'); else url.searchParams.delete('app'); window.history.replaceState({}, '', url); };
  useEffect(() => { const yes = () => setOnline(true); const no = () => setOnline(false); window.addEventListener('online', yes); window.addEventListener('offline', no); return () => { window.removeEventListener('online', yes); window.removeEventListener('offline', no); }; }, []);
  const tabs = mode === 'study' ? STUDY_TABS : SPEECH_TABS; const tab = mode === 'study' ? studyTab : speechTab; const setTab = mode === 'study' ? setStudyTab : setSpeechTab;
  return <div className="app"><Header mode={mode} setMode={setMode} user={user} dark={dark} setDark={setDark} online={online} notify={notify} /><Tabs tabs={tabs} value={tab} onChange={setTab} />{mode === 'study' ? <Study data={studyData} user={user} tab={studyTab} setTab={setStudyTab} notify={notify} /> : <Speeches data={speechData} user={user} tab={speechTab} setTab={setSpeechTab} notify={notify} />}<footer className="site-footer">Criado por Guilherme Almeida</footer><Notice notice={notice} onClear={() => setNotice(null)} /></div>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash"><BrandLogo /><Spinner label="Preparando sua biblioteca…" /></div>;
  return user ? <Application user={user} /> : <Login />;
}
