import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { getToken, setToken, clearToken } from '../lib/api'
import { authService } from '../services/auth'
import type { Role } from '../types'

interface AuthContextValue {
  user: { username: string; role: Role } | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string; role: Role } | null>(null)
  const [token, setTokenState] = useState<string | null>(getToken())

  const applyAuth = useCallback((auth: { token: string; username: string; role: Role }) => {
    setToken(auth.token)
    setTokenState(auth.token)
    setUser({ username: auth.username, role: auth.role })
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      const auth = await authService.login(username, password)
      applyAuth(auth)
    },
    [applyAuth],
  )

  const register = useCallback(
    async (username: string, password: string) => {
      const auth = await authService.register(username, password)
      applyAuth(auth)
    },
    [applyAuth],
  )

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, login, register, logout }),
    [user, token, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
