export interface UserResponse {
  id: string
  username: string
  email: string
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: UserResponse
}

export interface BookSearchResult {
  externalId: number
  title: string
  authors: string[]
  language?: string
  coverUrl?: string
  downloadCount: number
  epubAvailable: boolean
}

export interface BookFileInfo {
  id: string
  kind: 'EPUB' | 'PDF' | 'HTML'
  size: number
  mimeType?: string
  filename: string
  createdAt: string
}

export interface BookDetail {
  id: string
  title: string
  authors: string[]
  language?: string
  description?: string
  coverUrl?: string
  source: string
  externalId?: string
  files: BookFileInfo[]
}

const TOKEN_KEY = 'libros-tracker.token'

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

function authHeaders(): Headers {
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body != null) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(path, { ...init, headers })

  if (res.ok) {
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  let message = 'Error inesperado'
  let fields: Record<string, string> | undefined
  try {
    const body = (await res.json()) as { message?: string; fields?: Record<string, string> }
    if (body.message) message = body.message
    fields = body.fields
  } catch {
    message = `Error ${res.status}`
  }

  if (res.status === 401 && getToken()) {
    setToken(null)
    window.dispatchEvent(new Event('libros:unauthorized'))
  }

  throw new ApiError(res.status, message, fields)
}

export const api = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  me: () => request<UserResponse>('/api/auth/me'),

  search: async (query: string, page = 1) => {
    const path = `/api/books/search?q=${encodeURIComponent(query)}&page=${page}`
    try {
      return await request<BookSearchResult[]>(path)
    } catch (error) {
      if (error instanceof ApiError && error.status === 502) {
        await new Promise((resolve) => setTimeout(resolve, 700))
        return request<BookSearchResult[]>(path)
      }
      throw error
    }
  },

  importBook: (externalId: number) =>
    request<BookDetail>('/api/books/import', {
      method: 'POST',
      body: JSON.stringify({ externalId }),
    }),

  library: () => request<BookDetail[]>('/api/books'),

  async download(bookId: string, file: BookFileInfo): Promise<void> {
    const res = await fetch(`/api/books/${bookId}/files/${file.id}`, { headers: authHeaders() })
    if (!res.ok) {
      let message = `Error ${res.status}`
      try {
        const body = (await res.json()) as { message?: string }
        if (body.message) message = body.message
      } catch {
        message = `Error ${res.status}`
      }
      throw new ApiError(res.status, message)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },
}
