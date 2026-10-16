const PREFIX = 'libros-tracker.'

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStore<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function removeStore(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* almacenamiento no disponible */
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
