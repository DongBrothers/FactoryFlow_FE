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

// Access 토큰은 메모리에만 둔다. Refresh 는 httpOnly 쿠키(Path=/api/auth)라 JS 가 못 읽는다
let accessToken: string | null = null
let refreshing: Promise<boolean> | null = null
let onAuthLost = () => {}

/** 재발급까지 실패했을 때 할 일 (AuthProvider 가 로그인 화면으로 보낸다) */
export function setOnAuthLost(fn: () => void) {
  onAuthLost = fn
}

/** JWT 의 role 클레임. 서명 확인은 gateway 가 하므로 여기서는 화면 표시용으로만 읽는다 */
export function currentRole(): Role | null {
  if (!accessToken) return null
  const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(payload)).role
}

function send(path: string, init: RequestInit) {
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
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
      accessToken = res.ok ? (await res.json()).data.accessToken : null
      return res.ok
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** 성공하면 응답의 data, 실패하면 message 를 토스트로 띄우고 ApiError 를 던진다 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init)
  // /api/auth/* 의 401 은 로그인 실패 같은 업무 오류라 재발급하지 않는다
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
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
  accessToken = data.accessToken
  return currentRole()
}

export async function logout() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
  accessToken = null
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
