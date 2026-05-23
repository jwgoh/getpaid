function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(write: () => void): void {
  try {
    write();
  } catch {
    return;
  }
}

function set(key: string, value: string): void {
  safeWrite(() => localStorage.setItem(key, value));
}

function remove(key: string): void {
  safeWrite(() => localStorage.removeItem(key));
}

function getJson<T>(key: string): T | null {
  const raw = get(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setJson<T>(key: string, value: T): void {
  safeWrite(() => localStorage.setItem(key, JSON.stringify(value)));
}

export const storage = { get, set, remove, getJson, setJson };
