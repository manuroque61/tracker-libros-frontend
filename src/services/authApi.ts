import type { AuthResponse, Usuario } from '../types'
import { apiRequest } from './apiClient'

interface AuthResponseRaw {
  accessToken?: string
  token?: string
  tokenType?: string
  expiresIn?: number
  usuario?: Usuario
  user?: Usuario
}

function normalize(response: AuthResponseRaw): AuthResponse {
  const accessToken = response.accessToken ?? response.token
  const usuario = response.usuario ?? response.user
  if (!accessToken || !usuario) {
    throw new Error('Respuesta de autenticación inválida.')
  }
  return {
    accessToken,
    tokenType: response.tokenType ?? 'Bearer',
    expiresIn: response.expiresIn ?? 0,
    usuario,
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponseRaw>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return normalize(response)
}

export async function register(nombre: string, email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponseRaw>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password }),
  })
  return normalize(response)
}

export function me(): Promise<Usuario> {
  return apiRequest<Usuario>('/api/auth/me')
}
