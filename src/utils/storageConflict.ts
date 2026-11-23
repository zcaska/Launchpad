/** Use a separate slot per writer so conflicting saves cannot replace either copy. */
export function createStorageDraftKey(prefix: string): string {
  return `${prefix}${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

export function writeStorageDraft<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
    return true;
  } catch {
    return false;
  }
}

export function readStorageDrafts<T>(prefix: string, decode: (value: unknown) => T) {
  const drafts: Array<{ key: string; data: T; savedAt: number }> = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const draft = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (draft && Number.isFinite(draft.savedAt)) {
          drafts.push({ key, data: decode(draft.value), savedAt: draft.savedAt });
        }
      } catch { /* A damaged draft must not hide other recoverable drafts. */ }
    }
  } catch { /* Storage access may be restricted. */ }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}

export function removeStorageDraft(prefix: string, key: string): void {
  if (key.startsWith(prefix)) localStorage.removeItem(key);
}

export function withStorageLock<T>(name: string, write: () => T): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request(name, write) : Promise.resolve().then(write);
}
