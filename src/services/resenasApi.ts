import type { Resena } from '../types'
import { nowIso, readStore, writeStore } from './storage'

const KEY = 'resenas'

export function listarResenas(): Resena[] {
  return readStore<Resena[]>(KEY, [])
}

export function obtenerResena(libroId: string): Resena | null {
  return listarResenas().find((resena) => resena.libroId === libroId) ?? null
}

export function guardarResena(libroId: string, estrellas: number, texto: string): Resena {
  const resenas = listarResenas()
  const resena: Resena = {
    libroId,
    estrellas: Math.min(5, Math.max(1, Math.round(estrellas))),
    texto: texto.trim(),
    actualizadoEn: nowIso(),
  }
  const index = resenas.findIndex((item) => item.libroId === libroId)
  if (index === -1) resenas.push(resena)
  else resenas[index] = resena
  writeStore(KEY, resenas)
  return resena
}

export function eliminarResena(libroId: string): void {
  writeStore(
    KEY,
    listarResenas().filter((resena) => resena.libroId !== libroId),
  )
}
