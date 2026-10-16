export interface SaveData { mute: boolean; best: Record<string, { food: number; won: boolean }>; seenHelp: boolean }
const KEY = 'cuntur.save.v1';
const blank = (): SaveData => ({ mute: false, best: {}, seenHelp: false });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    return { ...blank(), ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch { return blank(); }
}
export function writeSave(s: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* modo privado o sin permiso: el juego sigue sin guardar */ }
}
export function recordRun(worldId: string, food: number, won: boolean): void {
  const s = loadSave();
  const prev = s.best[worldId] ?? { food: 0, won: false };
  s.best[worldId] = { food: Math.max(prev.food, food), won: prev.won || won };
  writeSave(s);
}
