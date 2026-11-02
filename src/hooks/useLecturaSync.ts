import { useCallback, useEffect, useMemo, useState } from 'react'
import { actualizarProgreso } from '../services/lecturasApi'
import { errorMessage } from '../services/apiClient'

interface Pendiente {
  porcentaje: number
  ubicacion: string | null
  paginaActual: number | null
}
interface SyncState {
  id?: string
  saving: boolean
  savedAt: number | null
  error: string | null
}

/** Una cola por lectura serializa peticiones y conserva la posición si falla el servidor. */
class ColaLectura {
  private pending: Pendiente | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private running: Promise<boolean> | null = null
  private mounted = false
  private savedAt: number | null = null
  private id: string | undefined
  private report: (state: SyncState) => void
  constructor(id: string | undefined, report: (state: SyncState) => void) {
    this.id = id
    this.report = report
  }

  private publish(saving: boolean, error: string | null) {
    if (this.mounted) this.report({ id: this.id, saving, error, savedAt: error ? null : this.savedAt })
  }
  start() { this.mounted = true }
  stop() { this.mounted = false; void this.flush() }
  hasPending() { return Boolean(this.pending || this.running) }
  save(data: Pendiente) {
    if (!this.id) return
    this.pending = data
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => { void this.flush() }, 800)
  }
  flush(): Promise<boolean> {
    if (this.timer) clearTimeout(this.timer)
    if (this.running) return this.running
    if (!this.id || !this.pending) return Promise.resolve(true)
    const id = this.id
    this.publish(true, null)
    this.running = (async () => {
      let error: string | null = null
      while (this.pending) {
        const data = this.pending
        this.pending = null
        try {
          await actualizarProgreso(id, {
            porcentaje: data.porcentaje, ubicacionDigital: data.ubicacion,
            paginaActual: data.paginaActual,
          })
          this.savedAt = Date.now()
        } catch (err) {
          this.pending ??= data
          error = errorMessage(err)
          if (!this.mounted) console.error('No se pudo guardar la última posición de lectura:', error)
          break
        }
      }
      this.publish(false, error)
      return this.pending === null
    })().finally(() => { this.running = null })
    return this.running
  }
}

export function useLecturaSync(lecturaId: string | undefined) {
  const [status, setStatus] = useState<SyncState>({ saving: false, savedAt: null, error: null })
  const cola = useMemo(() => new ColaLectura(lecturaId, setStatus), [lecturaId])
  useEffect(() => {
    cola.start()
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (cola.hasPending()) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      cola.stop()
    }
  }, [cola])
  const save = useCallback((porcentaje: number, ubicacion: string | null, paginaActual: number | null) => {
    cola.save({ porcentaje, ubicacion, paginaActual })
  }, [cola])
  const flush = useCallback(() => cola.flush(), [cola])
  const actual = status.id === lecturaId ? status : { saving: false, savedAt: null, error: null }
  return { ...actual, save, flush }
}
