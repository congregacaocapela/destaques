import { useEffect, useLayoutEffect, useRef } from 'react';
import { Icon } from './icons';

export const displayName = (email = '') => {
  const raw = email.split('@')[0].replace(/[._0-9]/g, ' ').trim().split(' ')[0] || 'Visitante';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const plain = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const dateLabel = (value) => {
  const date = value?.toDate?.() ?? (value?.seconds ? new Date(value.seconds * 1000) : new Date(value || 0));
  if (!date || Number.isNaN(date.getTime()) || date.getTime() === 0) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export function Spinner({ label = 'Carregando…' }) {
  return <div className="loading-state" role="status"><span className="spinner" />{label}</div>;
}

export function Empty({ icon = 'file', title, children }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={24} /></span><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}

export function Badge({ isPublic }) {
  return <span className={`badge ${isPublic ? 'public' : 'private'}`}><Icon name={isPublic ? 'globe' : 'lock'} size={12} />{isPublic ? 'Público' : 'Privado'}</span>;
}

export function Segmented({ value, onChange, options, label }) {
  return <div className="segmented" aria-label={label}>{options.map(([key, text]) => <button key={key} type="button" className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{text}</button>)}</div>;
}

export function AutoGrowTextarea({ className = '', onInput, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight + 2}px`;
    };
    const handleReset = () => requestAnimationFrame(resize);
    resize();
    element.form?.addEventListener('reset', handleReset);
    return () => element.form?.removeEventListener('reset', handleReset);
  }, [props.defaultValue, props.value]);
  const resizeOnInput = (event) => {
    event.currentTarget.style.height = 'auto';
    event.currentTarget.style.height = `${event.currentTarget.scrollHeight + 2}px`;
    onInput?.(event);
  };
  return <textarea {...props} ref={ref} className={`auto-grow ${className}`.trim()} onInput={resizeOnInput} />;
}

export function Tabs({ tabs, value, onChange }) {
  return <nav className="tabs" aria-label="Navegação principal">{tabs.map(([key, label, icon]) => <button key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)} aria-current={value === key ? 'page' : undefined}><Icon name={icon} size={19} /><span>{label}</span></button>)}</nav>;
}

export function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button></header>{children}</section></div>;
}

export function Confirm({ title, children, confirmLabel = 'Excluir', onConfirm, onClose, busy }) {
  return <Modal title={title} onClose={onClose}><p className="modal-copy">{children}</p><div className="modal-actions"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? 'Excluindo…' : confirmLabel}</button></div></Modal>;
}

export function ItemActions({ item, user, onEdit, onDelete }) {
  if (item.autorId !== user.uid && item.userId !== user.uid) return null;
  return <div className="item-actions"><button className="icon-button" onClick={() => onEdit(item)} aria-label="Editar"><Icon name="edit" size={17} /></button><button className="icon-button danger-ghost" onClick={() => onDelete(item)} aria-label="Excluir"><Icon name="trash" size={17} /></button></div>;
}

export function Notice({ notice, onClear }) {
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(onClear, 3500);
    return () => clearTimeout(timer);
  }, [notice, onClear]);
  if (!notice) return null;
  return <div className={`notice ${notice.type || 'success'}`} role="status">{notice.message}</div>;
}
