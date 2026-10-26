import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../api/client'
import type { MyAccount, Role } from '../api/client'

type Auth = {
  role: Role | null
  /** GET /api/auth/me. 불러오는 중이면 null */
  me: MyAccount | null
  meFailed: boolean
  login: (email: string, password: string) => Promise<Role | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 저장된 Access 가 살아 있으면 재발급 없이 바로 시작한다
  const [role, setRole] = useState<Role | null>(api.currentRole)
  const [ready, setReady] = useState(role !== null)
  // 내 정보는 받은 때의 역할과 함께 둔다. 역할이 바뀌면 지난 값은 보이지 않는다
  const [loaded, setLoaded] = useState<{ role: Role; me: MyAccount | null }>()
  const me = loaded?.role === role ? loaded.me : null
  const meFailed = loaded?.role === role && !loaded.me

  // 로그아웃하면 지난 사람의 내 정보를 버린다 (같은 역할의 다른 직원이 로그인할 수 있어서)
  const changeRole = (next: Role | null) => {
    setRole(next)
    if (!next) setLoaded(undefined)
  }

  useEffect(() => {
    api.setOnAuthLost(() => changeRole(null))
    // 다른 탭에서 로그인·로그아웃해 저장된 토큰이 바뀌면 이 탭도 따라간다
    const sync = () => changeRole(api.currentRole())
    addEventListener('storage', sync)
    // 없거나 만료됐으면 쿠키로 한 번 재발급을 시도한다
    if (!api.currentRole())
      api.refresh().then(() => {
        sync()
        setReady(true)
      })
    return () => removeEventListener('storage', sync)
  }, [])

  // 로그인하면 내 정보(이름, 권한)를 받는다. 관리자가 권한을 바꾸면 새로고침했을 때 반영된다
  useEffect(() => {
    if (!role) return
    let current = true
    api.me().then(
      (data) => current && setLoaded({ role, me: data }),
      () => current && setLoaded({ role, me: null }),
    )
    return () => {
      current = false
    }
  }, [role])

  const login = async (email: string, password: string) => {
    const next = await api.login(email, password)
    changeRole(next)
    return next
  }
  const logout = async () => {
    await api.logout()
    changeRole(null)
  }

  if (!ready) return null
  return <AuthContext.Provider value={{ role, me, meFailed, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider 안에서만 쓴다')
  return auth
}
