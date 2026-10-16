import type { ArchivoDigital } from '../types'
import { ensureSeed } from './seed'
import { delay, nowIso, readStore, uid, writeStore } from './storage'

const KEY = 'archivos'

export function listarPorLibro(libroId: string): Promise<ArchivoDigital[]> {
  ensureSeed()
  return Promise.resolve(readStore<ArchivoDigital[]>(KEY, []).filter((archivo) => archivo.libroId === libroId))
}

/**
 * En el prototipo sólo se guardan los metadatos del archivo; el contenido real
 * se abre localmente en el lector. Cuando exista `POST /api/lecturas/{id}/archivos`
 * se reemplaza por una subida multipart.
 */
export async function asociar(libroId: string, file: File): Promise<ArchivoDigital> {
  await delay(80)
  const archivos = readStore<ArchivoDigital[]>(KEY, [])
  const formato: ArchivoDigital['formato'] = file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'EPUB'
  const archivo: ArchivoDigital = {
    id: uid(),
    libroId,
    nombre: file.name,
    formato,
    tamano: file.size,
    creadoEn: nowIso(),
  }
  writeStore(KEY, [...archivos, archivo])
  return archivo
}

export async function eliminar(id: string): Promise<void> {
  await delay(40)
  writeStore(KEY, readStore<ArchivoDigital[]>(KEY, []).filter((archivo) => archivo.id !== id))
}
