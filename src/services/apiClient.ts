const STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud no es válida.',
  404: 'No se encontró el recurso solicitado.',
  409: 'El recurso ya existe.',
  500: 'Ocurrió un error en el servidor.',
  502: 'El servicio externo no respondió. Reintentá en unos segundos.',
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

/**
 * Cliente HTTP centralizado. Todas las llamadas reales al backend oficial
 * pasan por aquí; en desarrollo Vite proxya `/api` hacia http://localhost:8080.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError(0, 'Sin conexión con el servidor. Verificá que el backend esté corriendo en localhost:8080.')
  }

  if (res.ok) {
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  let message = STATUS_MESSAGES[res.status] ?? `Error ${res.status}`
  try {
    const body = (await res.json()) as { message?: string }
    if (body.message) message = body.message
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  throw new ApiError(res.status, message)
}
