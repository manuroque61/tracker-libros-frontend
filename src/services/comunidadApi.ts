import { apiRequest } from './apiClient'

export interface Amigo { usuarioId: number; solicitudId: number; nombre: string; email: string }
export interface Solicitud { id: number; usuarioId: number; nombre: string; email: string; recibida: boolean; creadaEn: string }
export interface Club { id: number | null; nombre: string; descripcion?: string; rol: string; estado: string; nombreCreador: string; publico: boolean; bookKey?: string; tituloLibro?: string }
export interface Mensaje { id: number; autorId: number; autor: string; texto: string; enviadoEn: string }
export interface Recomendacion { id: number; bookKey: string; titulo: string; autor: string; portadaUrl?: string; estrellas: number; comentario?: string; amigoId: number; amigo: string; actualizadoEn: string }
export interface ActividadLectura { amigoId: number; amigo: string; libroId: number; titulo: string; autor: string; portadaUrl?: string; porcentaje: number; fechaInicio?: string }
export interface ComentarioClub { id: number; temaId: number; bookKey: string; tituloLibro: string; texto: string; porcentaje: number; ubicacion?: string; autorId: number; autor: string; creadoEn: string }
export interface PaginaComentarios { comentarios: Recomendacion[]; hayMas: boolean; pagina: number }

const base = '/api/comunidad'
export const listarAmigos = () => apiRequest<Amigo[]>(`${base}/amigos`)
export const listarSolicitudes = () => apiRequest<Solicitud[]>(`${base}/amigos/solicitudes`)
export const solicitarAmistad = (email: string) => apiRequest(`${base}/amigos/solicitudes`, { method: 'POST', body: JSON.stringify({ email }) })
export const responderSolicitud = (id: number, aceptar: boolean) => apiRequest<void>(`${base}/amigos/solicitudes/${id}`, { method: 'PATCH', body: JSON.stringify({ aceptar }) })
export const quitarAmigo = (id: number) => apiRequest<void>(`${base}/amigos/${id}`, { method: 'DELETE' })
export const listarClubes = () => apiRequest<Club[]>(`${base}/clubes`)
export const crearClub = (club: { nombre: string; descripcion: string; publico: boolean; bookKey?: string; tituloLibro?: string }) => apiRequest<Club>(`${base}/clubes`, { method: 'POST', body: JSON.stringify(club) })
export const listarClubesPublicos = () => apiRequest<Club[]>(`${base}/clubes/publicos`)
export const unirseAClub = (id: number) => apiRequest<Club>(`${base}/clubes/${id}/unirse`, { method: 'POST' })
export const invitarAlClub = (id: number, email: string) => {
  if (!Number.isSafeInteger(id) || id <= 0) return Promise.reject(new Error('No se pudo identificar el club. Actualiza la lista e inténtalo otra vez.'))
  return apiRequest<Club>(`${base}/clubes/${id}/invitaciones`, { method: 'POST', body: JSON.stringify({ email }) })
}
export const responderInvitacion = (id: number, aceptar: boolean) => apiRequest<void>(`${base}/clubes/${id}/invitacion`, { method: 'PATCH', body: JSON.stringify({ aceptar }) })
export const listarMensajesClub = (id: number, despuesDe = 0) => apiRequest<Mensaje[]>(`${base}/clubes/${id}/mensajes?despuesDe=${despuesDe}`)
export const enviarMensajeClub = (id: number, texto: string) => apiRequest<Mensaje>(`${base}/clubes/${id}/mensajes`, { method: 'POST', body: JSON.stringify({ texto }) })
export const listarMensajesAmigo = (id: number, despuesDe = 0) => apiRequest<Mensaje[]>(`${base}/amigos/${id}/mensajes?despuesDe=${despuesDe}`)
export const enviarMensajeAmigo = (id: number, texto: string) => apiRequest<Mensaje>(`${base}/amigos/${id}/mensajes`, { method: 'POST', body: JSON.stringify({ texto }) })
export const listarRecomendaciones = () => apiRequest<Recomendacion[]>(`${base}/recomendaciones`)
export const listarActividadAmigos = () => apiRequest<ActividadLectura[]>(`${base}/actividad`)
export const listarComentariosRecientes = (pagina = 0) => apiRequest<PaginaComentarios>(`${base}/actividad/comentarios?pagina=${pagina}`)
export const listarComentariosLibro = (bookKey: string, pagina = 0) => apiRequest<PaginaComentarios>(`${base}/libros/${encodeURIComponent(bookKey)}/comentarios?pagina=${pagina}`)
export const syncCalificaciones = (calificaciones: Array<{ bookKey: string; titulo: string; autor: string; portadaUrl?: string; estrellas: number; comentario?: string }>) => apiRequest<void>(`${base}/calificaciones/sync`, { method: 'POST', body: JSON.stringify({ calificaciones }) })
export const eliminarCalificacionCompartida = (bookKey: string) => apiRequest<void>(`${base}/calificaciones/${encodeURIComponent(bookKey)}`, { method: 'DELETE' })
export const listarComentariosClub = (clubId: number, bookKey: string, hasta: number) => apiRequest<ComentarioClub[]>(`${base}/clubes/${clubId}/libros/${encodeURIComponent(bookKey)}/comentarios?hasta=${hasta}`)
export const enviarComentarioClub = (clubId: number, bookKey: string, titulo: string, texto: string, porcentaje: number, ubicacion?: string, temaId?: number) => apiRequest<ComentarioClub>(`${base}/clubes/${clubId}/libros/${encodeURIComponent(bookKey)}/comentarios?titulo=${encodeURIComponent(titulo)}`, { method: 'POST', body: JSON.stringify({ texto, porcentaje, ubicacion, temaId }) })
