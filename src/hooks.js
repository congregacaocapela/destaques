import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { auth, db, speechPaths, studyPaths } from './firebase';

export function useAuth() {
  const [state, setState] = useState({ user: null, loading: true });
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, loading: false })), []);
  return state;
}

function useLiveCollections(sources, enabled = true) {
  const [buckets, setBuckets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const signature = sources.map((source) => `${source.key}:${source.path}`).join('|');

  useEffect(() => {
    if (!enabled || sources.length === 0) return undefined;
    let active = true;
    setLoading(true);
    const loaded = new Set();
    const stops = sources.map((source) => onSnapshot(
      query(collection(db, source.path)),
      { includeMetadataChanges: false },
      (snapshot) => {
        if (!active) return;
        setBuckets((current) => ({
          ...current,
          [source.key]: snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
            path: source.path,
            isPublic: source.isPublic,
          })),
        }));
        loaded.add(source.key);
        if (loaded.size === sources.length) setLoading(false);
      },
      (reason) => {
        console.error(reason);
        setError('Não foi possível sincronizar todos os dados.');
        loaded.add(source.key);
        if (loaded.size === sources.length) setLoading(false);
      },
    ));
    return () => { active = false; stops.forEach((stop) => stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, signature]);

  return { buckets, loading, error };
}

const byNewest = (a, b) => {
  const time = (value) => value?.toMillis?.() ?? value?.seconds * 1000 ?? new Date(value || 0).getTime();
  return time(b.createdAt) - time(a.createdAt);
};

export function useStudyData(user) {
  const paths = useMemo(() => user ? studyPaths(user.uid) : null, [user]);
  const sources = useMemo(() => paths ? [
    { key: 'publicHighlights', path: paths.publicHighlights, isPublic: true },
    { key: 'privateHighlights', path: paths.privateHighlights, isPublic: false },
    { key: 'publicResearch', path: paths.publicResearch, isPublic: true },
    { key: 'privateResearch', path: paths.privateResearch, isPublic: false },
  ] : [], [paths]);
  const live = useLiveCollections(sources, Boolean(user));
  return useMemo(() => ({
    ...live,
    paths,
    highlights: [...(live.buckets.publicHighlights || []), ...(live.buckets.privateHighlights || [])].sort(byNewest),
    research: [...(live.buckets.publicResearch || []), ...(live.buckets.privateResearch || [])].sort(byNewest),
  }), [live, paths]);
}

export function useSpeechData(user) {
  const paths = useMemo(() => user ? speechPaths(user.uid) : null, [user]);
  const sources = useMemo(() => paths ? [
    { key: 'publicSpeeches', path: paths.publicSpeeches, isPublic: true },
    { key: 'privateSpeeches', path: paths.privateSpeeches, isPublic: false },
  ] : [], [paths]);
  const live = useLiveCollections(sources, Boolean(user));
  return useMemo(() => ({
    ...live,
    paths,
    speeches: [...(live.buckets.publicSpeeches || []), ...(live.buckets.privateSpeeches || [])].sort(byNewest),
  }), [live, paths]);
}

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, setDark];
}
