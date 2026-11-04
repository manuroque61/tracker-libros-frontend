const PREFIX = 'libros-tracker.'
const PROFILE_PREFIX = `${PREFIX}profile.`
const MIGRATION_KEY = `${PREFIX}profile-migrated-v1`
const LEGACY_KEYS = [
  'libros',
  'lecturas',
  'sesiones',
  'anotaciones',
  'archivos',
  'resenas',
  'biblioteca.formato',
  'biblioteca.estado',
]

let activeProfileId: string | null = null

function storeKey(key: string): string {
  return activeProfileId ? `${PROFILE_PREFIX}${activeProfileId}.${key}` : PREFIX + key
}

/** Selects the local data namespace for the signed-in user, or the guest profile. */
export function setStorageProfile(userId: number | string | null): void {
  activeProfileId = userId == null ? null : encodeURIComponent(String(userId))
  if (!activeProfileId) return

  try {
    if (window.localStorage.getItem(MIGRATION_KEY)) return
    for (const key of LEGACY_KEYS) {
      const legacyValue = window.localStorage.getItem(PREFIX + key)
      const profileKey = storeKey(key)
      if (legacyValue && !window.localStorage.getItem(profileKey)) {
        window.localStorage.setItem(profileKey, legacyValue)
      }
    }
    window.localStorage.setItem(MIGRATION_KEY, activeProfileId)
  } catch {
    /* storage migration is best-effort; the active profile remains isolated */
  }
}

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(storeKey(key))
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStore<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(storeKey(key), JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function removeStore(key: string): void {
  try {
    window.localStorage.removeItem(storeKey(key))
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
