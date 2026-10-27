import type { AuthResponse, Usuario } from '../types'
import { apiRequest } from './apiClient'
import { setToken } from './authToken'

interface LoginResponseRaw {
  accessToken: string
  tokenType?: string
  expiresIn?: number
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<LoginResponseRaw>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  setToken(response.accessToken)

  try {
    const usuario = await me()
    return {
      accessToken: response.accessToken,
      tokenType: response.tokenType ?? 'Bearer',
      expiresIn: response.expiresIn ?? 0,
      usuario,
    }
  } catch (error) {
    setToken(null)
    throw error
  }
}

export async function register(nombre: string, email: string, password: string): Promise<AuthResponse> {
  await apiRequest<Usuario>('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password }),
  })
  return login(email, password)
}

export function me(): Promise<Usuario> {
  return apiRequest<Usuario>('/api/usuarios/me')
}
