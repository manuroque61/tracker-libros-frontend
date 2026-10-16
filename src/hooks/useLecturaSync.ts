import { useCallback, useEffect, useRef, useState } from 'react'
import { actualizarProgreso } from '../services/lecturasApi'

interface Pendiente {
  porcentaje: number
  ubicacion: string | null
  paginaActual: number | null
}

/**
 * Guarda el progreso con debounce y hace flush al desmontar. Simula la
 * sincronización periódica del lector contra `PATCH /api/lecturas/{id}/progreso`.
 */
export function useLecturaSync(lecturaId: string | undefined) {
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Pendiente | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timer.current) clearTimeout(timer.current)
      if (lecturaId && pending.current) {
        const data = pending.current
        pending.current = null
        void actualizarProgreso(lecturaId, {
          porcentaje: data.porcentaje,
          ubicacionDigital: data.ubicacion,
          paginaActual: data.paginaActual,
        }).catch(() => undefined)
      }
    }
  }, [lecturaId])

  const flush = useCallback(() => {
    if (!lecturaId || !pending.current) return
    const data = pending.current
    pending.current = null
    setSaving(true)
    actualizarProgreso(lecturaId, {
      porcentaje: data.porcentaje,
      ubicacionDigital: data.ubicacion,
      paginaActual: data.paginaActual,
    })
      .then(() => {
        if (mounted.current) setSavedAt(Date.now())
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted.current) setSaving(false)
      })
  }, [lecturaId])

  const save = useCallback(
    (porcentaje: number, ubicacion: string | null, paginaActual: number | null) => {
      pending.current = { porcentaje, ubicacion, paginaActual }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, 800)
    },
    [flush],
  )

  return { saving, savedAt, save, flush }
}
