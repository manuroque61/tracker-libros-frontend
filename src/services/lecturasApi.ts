import { ApiError, apiRequest } from './apiClient'
import { backendId, toLectura, type LecturaRespuestaDTO } from '../types/backend'
import type { EstadoLectura, FormatoLectura, Lectura, Sesion } from '../types'
import { ESTADOS, FORMATOS } from '../types'
import { getToken } from './authToken'
import { nowIso, readStore, uid } from './storage'

function localKey(key: string): string {
  const token = getToken()
  if (!token) throw new Error('Iniciá sesión para guardar datos locales de la lectura.')
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string }
    if (!payload.sub) throw new Error()
    return `lecturas-locales.${encodeURIComponent(payload.sub)}.${key}`
  } catch {
    throw new Error('No se pudo identificar al usuario para los datos locales.')
  }
}

export interface DatosLocalesLectura {
  totalPaginas?: number | null
  fechaInicio?: string | null
  fechaFin?: string | null
}

export function obtenerDatosLocales(id: string): DatosLocalesLectura {
  return readStore<DatosLocalesLectura>(localKey(`datos.${backendId(id)}`), {})
}

export function guardarDatosLocales(id: string, datos: DatosLocalesLectura): void {
  if (datos.totalPaginas != null && (!Number.isSafeInteger(datos.totalPaginas) || datos.totalPaginas <= 0)) throw new Error('Las páginas totales locales deben ser un entero positivo.')
  try {
    window.localStorage.setItem(`libros-tracker.${localKey(`datos.${backendId(id)}`)}`, JSON.stringify({ ...obtenerDatosLocales(id), ...datos }))
  } catch {
    throw new Error('No se pudieron guardar los datos provisionales en este navegador.')
  }
}

function adaptar(dto: LecturaRespuestaDTO): Lectura {
  return { ...toLectura(dto), totalPaginas: obtenerDatosLocales(String(dto.id)).totalPaginas }
}

export async function listarTodas(): Promise<Lectura[]> {
  return (await apiRequest<LecturaRespuestaDTO[]>('/api/lecturas', { cache: 'no-store' })).map(adaptar)
}

export async function listarPorLibro(libroId: string): Promise<Lectura[]> {
  const id = String(backendId(libroId))
  return (await listarTodas()).filter((lectura) => lectura.libroId === id)
}

export async function obtenerLectura(id: string): Promise<Lectura | null> {
  const dto = await apiRequest<LecturaRespuestaDTO>(`/api/lecturas/${backendId(id)}`)
  return adaptar(dto)
}
export async function crearLectura(
  libroId: string,
  formato: FormatoLectura,
  totalPaginas: number | null,
): Promise<Lectura> {
  const numero = backendId(libroId)
  if (!FORMATOS.includes(formato)) throw new Error('Seleccioná un formato válido.')
  if (totalPaginas != null && (!Number.isSafeInteger(totalPaginas) || totalPaginas <= 0)) {
    throw new Error('Las páginas totales deben ser un entero positivo.')
  }
  try {
    const dto = await apiRequest<LecturaRespuestaDTO>('/api/lecturas', {
      method: 'POST', body: JSON.stringify({ libroId: numero, formato }),
    })
    if (totalPaginas != null) {
      try { guardarDatosLocales(String(dto.id), { totalPaginas }) }
      catch { throw new Error('La lectura se creó en el servidor, pero no se guardó el total local. Actualizá la pantalla antes de reintentar.') }
    }
    return adaptar(dto)
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new ApiError(409, 'Ya tenés una lectura de este libro en ese formato. Actualizá la pantalla para verla.')
    }
    throw error
  }
}

export interface ProgresoPatch {
  porcentaje?: number
  paginaActual?: number | null
  totalPaginas?: number | null
  estado?: EstadoLectura
  ubicacionDigital?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
}

export async function actualizarEstado(id: string, estado: EstadoLectura): Promise<Lectura> {
  if (!ESTADOS.includes(estado)) throw new Error('El estado de lectura no es válido.')
  return adaptar(await apiRequest<LecturaRespuestaDTO>(`/api/lecturas/${backendId(id)}/estado`, {
    method: 'PATCH', body: JSON.stringify({ estado }),
  }))
}

export async function actualizarProgreso(id: string, patch: ProgresoPatch): Promise<Lectura> {
  const numero = backendId(id)
  if (patch.totalPaginas != null && (!Number.isSafeInteger(patch.totalPaginas) || patch.totalPaginas <= 0)) throw new Error('Las páginas totales locales deben ser un entero positivo.')
  // Consultamos el formato real: PDF también usa porcentajeDigital, nunca paginaActual.
  let actual = await obtenerLectura(id)
  if (!actual) throw new Error('Lectura no encontrada')
  let body: { paginaActual: number } | { porcentajeDigital: number; ubicacionDigital: string | null } | undefined
  if (actual.formato === 'FISICO' && patch.paginaActual != null) {
    if (!Number.isSafeInteger(patch.paginaActual) || patch.paginaActual < 0) throw new Error('La página actual debe ser un entero no negativo.')
    body = { paginaActual: patch.paginaActual }
  } else if (actual.formato !== 'FISICO' && (patch.porcentaje !== undefined || patch.ubicacionDigital !== undefined)) {
    const porcentaje = patch.porcentaje ?? actual.porcentaje
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) throw new Error('El porcentaje debe estar entre 0 y 100.')
    body = { porcentajeDigital: porcentaje, ubicacionDigital: patch.ubicacionDigital === undefined ? actual.ubicacionDigital ?? null : patch.ubicacionDigital }
  }
  if (patch.estado !== undefined && !ESTADOS.includes(patch.estado)) throw new Error('El estado de lectura no es válido.')
  if (body) actual = adaptar(await apiRequest<LecturaRespuestaDTO>(`/api/lecturas/${numero}/progreso`, {
    method: 'PATCH', body: JSON.stringify(body),
  }))
  if (patch.estado !== undefined) {
    try { actual = await actualizarEstado(id, patch.estado) }
    catch (error) { throw new Error(`${body ? 'El progreso se guardó, pero el estado no pudo guardarse. ' : ''}${error instanceof Error ? error.message : 'Reintentá el cambio de estado.'}`) }
  }
  const locales: DatosLocalesLectura = {}
  if (patch.totalPaginas !== undefined) locales.totalPaginas = patch.totalPaginas
  if (patch.fechaInicio !== undefined) locales.fechaInicio = patch.fechaInicio
  if (patch.fechaFin !== undefined) locales.fechaFin = patch.fechaFin
  if (Object.keys(locales).length) {
    try { guardarDatosLocales(id, locales) }
    catch { throw new Error('Los cambios remotos se guardaron, pero no se pudieron guardar los datos provisionales locales.') }
  }
  return { ...actual, totalPaginas: obtenerDatosLocales(id).totalPaginas }
}

export async function eliminarLectura(id: string): Promise<void> {
  await apiRequest<void>(`/api/lecturas/${backendId(id)}`, { method: 'DELETE' })
  // Conservamos los datos locales: no eliminamos sesiones ni anotaciones preexistentes.
}

export interface SesionInput {
  minutos?: number | null
  paginasLeidas?: number | null
  paginaActual?: number | null
  nota?: string | null
}

export async function registrarSesion(lecturaId: string, input: SesionInput): Promise<Sesion> {
  backendId(lecturaId)
  const key = localKey('sesiones')
  const sesiones = readStore<Sesion[]>(key, [])
  const sesion: Sesion = { id: uid(), lecturaId, fecha: nowIso(), ...input }
  try { window.localStorage.setItem(`libros-tracker.${key}`, JSON.stringify([sesion, ...sesiones])) }
  catch { throw new Error('No se pudo guardar la sesión local en este navegador.') }
  return sesion
}

export function listarSesiones(lecturaId: string): Promise<Sesion[]> {
  return Promise.resolve(
    readStore<Sesion[]>(localKey('sesiones'), [])
      .filter((sesion) => sesion.lecturaId === lecturaId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  )
}

export function listarTodasSesiones(): Promise<Sesion[]> {
  return Promise.resolve(readStore<Sesion[]>(localKey('sesiones'), []))
}
