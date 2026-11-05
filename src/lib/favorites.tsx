import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';

// Saved on this browser/device only; no account, backend or personal details involved.
const KEY = 'homey:favorites:v1';
const MAX_SAVED = 500;
const FavoritesContext = createContext<{
  ids: string[];
  has: (variantId: string) => boolean;
  toggle: (variantId: string) => void;
  count: number;
}>({ids: [], has: () => false, toggle: () => {}, count: 0});

function readSaved(): string[] {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(data)
      ? [...new Set(data.filter((id): id is string => typeof id === 'string' && /^[\w-]{1,100}$/.test(id)))].slice(0, MAX_SAVED)
      : [];
  } catch { return []; }
}

export function FavoritesProvider({children}: {children: ReactNode}) {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setIds(readSaved()); setLoaded(true); }, []);
  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage disabled/full */ }
  }, [ids, loaded]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === KEY || event.key === null) setIds(readSaved()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const toggle = useCallback((id: string) => {
    if (!id || !/^[\w-]{1,100}$/.test(id)) return;
    setIds(previous => previous.includes(id) ? previous.filter(x => x !== id) : [id, ...previous].slice(0, MAX_SAVED));
  }, []);
  const savedSet = useMemo(() => new Set(ids), [ids]);
  const value = useMemo(() => ({ids, count: ids.length, has: (id: string) => savedSet.has(id), toggle}), [ids, savedSet, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
