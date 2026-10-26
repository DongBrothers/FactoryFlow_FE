import { toast } from '../layout/toast'

export type Role = 'SALES' | 'PURCHASE' | 'PRODUCTION' | 'ADMIN'

/** 백엔드 실패 응답 { code, message } */
export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Access 토큰은 localStorage 에 둔다 (새로고침·다른 탭에서도 재발급 없이 쓰게).
// Refresh 는 httpOnly 쿠키(Path=/api/auth)라 JS 가 못 읽는다
const TOKEN_KEY = 'accessToken'
const accessToken = () => localStorage.getItem(TOKEN_KEY)
function setAccessToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}
let refreshing: Promise<boolean> | null = null
let onAuthLost = () => {}

/** 재발급까지 실패했을 때 할 일 (AuthProvider 가 로그인 화면으로 보낸다) */
export function setOnAuthLost(fn: () => void) {
  onAuthLost = fn
}

/** JWT 의 role 클레임. 서명 확인은 gateway 가 하므로 여기서는 화면 표시용으로만 읽는다. 만료된 토큰이면 null */
export function currentRole(): Role | null {
  const token = accessToken()
  if (!token) return null
  const { role, exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  return exp && exp * 1000 <= Date.now() ? null : role
}

function send(path: string, init: RequestInit) {
  const token = accessToken()
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  })
}

/**
 * 쿠키의 Refresh 로 새 Access 를 받는다. 성공하면 true.
 * Refresh 는 쓰면 바뀌므로(회전) 동시에 불려도 요청은 하나만 보낸다
 */
export function refresh(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/token/refresh', { method: 'POST' })
    .then(async (res) => {
      setAccessToken(res.ok ? (await res.json()).data.accessToken : null)
      return res.ok
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

const PUBLIC_AUTH = ['/api/auth/login', '/api/auth/activation', '/api/auth/token/refresh', '/api/auth/logout']

/** 성공하면 응답의 data, 실패하면 message 를 토스트로 띄우고 ApiError 를 던진다 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init)
  // 공개 인증 API 의 401 은 로그인 실패 같은 업무 오류라 재발급하지 않는다
  if (res.status === 401 && !PUBLIC_AUTH.includes(path)) {
    if (await refresh()) {
      res = await send(path, init)
    } else {
      onAuthLost()
    }
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new ApiError(res.status, body?.code ?? 'UNKNOWN', body?.message ?? '요청을 처리하지 못했습니다.')
    toast(error.message)
    throw error
  }
  return body.data
}

export async function login(email: string, password: string): Promise<Role | null> {
  const data = await api<{ accessToken: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAccessToken(data.accessToken)
  return currentRole()
}

/** 내 정보. 상단 이름과 메뉴(권한)를 고른다 */
export type MyAccount = { publicId: string; name: string; role: Role; permissions: string[] }

export const me = () => api<MyAccount>('/api/auth/me')

export async function logout() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
  setAccessToken(null)
}

/** 메일 링크의 토큰으로 비밀번호를 정한다. 링크가 만료됐거나 이미 쓰였으면(AUTH-004) false */
export async function activate(token: string, password: string): Promise<boolean> {
  try {
    await api('/api/auth/activation', { method: 'POST', body: JSON.stringify({ token, password }) })
    return true
  } catch (e) {
    if (e instanceof ApiError && e.code === 'AUTH-004') return false
    throw e
  }
}
