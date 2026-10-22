import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../api/client'
import type { Role } from '../api/client'

type Auth = {
  role: Role | null
  login: (email: string, password: string) => Promise<Role | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 저장된 Access 가 살아 있으면 재발급 없이 바로 시작한다
  const [role, setRole] = useState<Role | null>(api.currentRole)
  const [ready, setReady] = useState(role !== null)

  useEffect(() => {
    api.setOnAuthLost(() => setRole(null))
    // 다른 탭에서 로그인·로그아웃해 저장된 토큰이 바뀌면 이 탭도 따라간다
    const sync = () => setRole(api.currentRole())
    addEventListener('storage', sync)
    // 없거나 만료됐으면 쿠키로 한 번 재발급을 시도한다
    if (!api.currentRole())
      api.refresh().then(() => {
        sync()
        setReady(true)
      })
    return () => removeEventListener('storage', sync)
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
