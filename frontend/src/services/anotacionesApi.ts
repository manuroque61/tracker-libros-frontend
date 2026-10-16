import type { Anotacion, TipoAnotacion } from '../types'
import { ensureSeed } from './seed'
import { delay, nowIso, readStore, uid, writeStore } from './storage'

const KEY = 'anotaciones'

export interface AnotacionInput {
  libroId: string
  lecturaId?: string | null
  tipo: TipoAnotacion
  texto: string
  cita?: string | null
  ubicacion?: string | null
  porcentaje?: number | null
}

export function listarPorLibro(libroId: string): Promise<Anotacion[]> {
  ensureSeed()
  return Promise.resolve(
    readStore<Anotacion[]>(KEY, [])
      .filter((anotacion) => anotacion.libroId === libroId)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
  )
}

export async function crear(input: AnotacionInput): Promise<Anotacion> {
  await delay(60)
  const anotaciones = readStore<Anotacion[]>(KEY, [])
  const anotacion: Anotacion = { id: uid(), creadoEn: nowIso(), ...input }
  writeStore(KEY, [anotacion, ...anotaciones])
  return anotacion
}

export async function eliminar(id: string): Promise<void> {
  await delay(40)
  writeStore(KEY, readStore<Anotacion[]>(KEY, []).filter((anotacion) => anotacion.id !== id))
}
