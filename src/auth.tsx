import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from './api'
import type { Role } from './api'

type Auth = {
  role: Role | null
  login: (email: string, password: string) => Promise<Role | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api.setOnAuthLost(() => setRole(null))
    // 새로고침하면 메모리의 Access 가 사라지므로 쿠키로 한 번 재발급을 시도한다
    api.refresh().then(() => {
      setRole(api.currentRole())
      setReady(true)
    })
  }, [])

  const login = async (email: string, password: string) => {
    const next = await api.login(email, password)
    setRole(next)
    return next
  }
  const logout = async () => {
    await api.logout()
    setRole(null)
  }

  if (!ready) return null
  return <AuthContext.Provider value={{ role, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider 안에서만 쓴다')
  return auth
}
