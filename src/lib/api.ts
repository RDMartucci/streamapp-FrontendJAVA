import type { ApiError } from '../types'

const BASE_URL = '/api'

const TOKEN_KEY = 'streamapp_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiClientError extends Error {
  status: number
  code: string
  fields?: Record<string, string>

  constructor(status: number, body: ApiError) {
    super(body.message || `Error ${status}`)
    this.status = status
    this.code = body.error || 'ERROR'
    this.fields = body.fields
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; query?: Record<string, string> } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path, window.location.origin)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value)
    }
  }

  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.auth !== false) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    let body: ApiError
    try {
      body = (await res.json()) as ApiError
    } catch {
      body = { error: 'ERROR', message: `Error ${res.status}` }
    }
    if (res.status === 401) {
      clearToken()
      window.location.assign('/login')
    }
    throw new ApiClientError(res.status, body)
  }

  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean; query?: Record<string, string> }) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: { auth?: boolean; query?: Record<string, string> }) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
