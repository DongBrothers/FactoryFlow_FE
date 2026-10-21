import { beforeEach, expect, test, vi } from 'vitest'

// 서명은 검사하지 않으므로 payload 만 맞춘 가짜 JWT
const jwt = (role: string) => `h.${btoa(JSON.stringify({ sub: 'u1', role }))}.s`
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
const ok = (data: unknown) => json(200, { data, status: 200, message: 'ok' })
const unauthorized = () => json(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' })

let api: typeof import('./client')
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.resetModules() // 모듈 안의 토큰 상태를 테스트마다 비운다
  api = await import('./client')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

const calls = (path: string) => fetchMock.mock.calls.filter(([p]) => p === path)

test('로그인하면 토큰의 역할을 돌려주고, 이후 요청에 Bearer 를 붙인다', async () => {
  fetchMock
    .mockResolvedValueOnce(ok({ accessToken: jwt('SALES') }))
    .mockResolvedValueOnce(ok({ items: [] }))

  expect(await api.login('a@gmail.com', 'pw')).toBe('SALES')
  await api.api('/api/orders')

  expect(calls('/api/orders')[0][1].headers.Authorization).toBe(`Bearer ${jwt('SALES')}`)
})

test('401 이면 한 번 재발급하고 새 토큰으로 다시 보낸다', async () => {
  fetchMock.mockImplementation(async (path: string, init: RequestInit) => {
    if (path === '/api/auth/token/refresh') return ok({ accessToken: jwt('PRODUCTION') })
    const auth = (init.headers as Record<string, string>).Authorization
    return auth === `Bearer ${jwt('PRODUCTION')}` ? ok({ id: 1 }) : unauthorized()
  })

  expect(await api.api('/api/production/work-orders/1')).toEqual({ id: 1 })
  expect(calls('/api/auth/token/refresh')).toHaveLength(1)
  expect(api.currentRole()).toBe('PRODUCTION')
})

test('동시에 401 이 여러 개 나도 재발급은 한 번만 한다 (Refresh 회전 때문에)', async () => {
  fetchMock.mockImplementation(async (path: string, init: RequestInit) => {
    if (path === '/api/auth/token/refresh') return ok({ accessToken: jwt('SALES') })
    return (init.headers as Record<string, string>).Authorization ? ok(path) : unauthorized()
  })

  await Promise.all([api.api('/api/orders'), api.api('/api/inventory/parts'), api.refresh()])

  expect(calls('/api/auth/token/refresh')).toHaveLength(1)
})

test('재발급도 실패하면 로그아웃 처리하고 오류를 던진다', async () => {
  const lost = vi.fn()
  api.setOnAuthLost(lost)
  fetchMock.mockImplementation(async () => unauthorized())

  await expect(api.api('/api/orders')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
  expect(lost).toHaveBeenCalledOnce()
  expect(api.currentRole()).toBeNull()
})

test('로그인 실패(401)는 재발급하지 않고 서버 메시지를 그대로 던진다', async () => {
  fetchMock.mockResolvedValue(json(401, { code: 'AUTH-003', message: '이메일 또는 비밀번호가 맞지 않습니다.' }))

  await expect(api.login('a@gmail.com', 'x')).rejects.toThrow('이메일 또는 비밀번호가 맞지 않습니다.')
  expect(calls('/api/auth/token/refresh')).toHaveLength(0)
})

test('활성화는 토큰과 비밀번호를 보내고, 204 면 true', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

  expect(await api.activate('t1', 'pw-1234!')).toBe(true)
  expect(JSON.parse(calls('/api/auth/activation')[0][1].body)).toEqual({ token: 't1', password: 'pw-1234!' })
})

test('활성화 링크가 만료됐거나 이미 쓰였으면(AUTH-004) false', async () => {
  fetchMock.mockResolvedValue(json(400, { code: 'AUTH-004', message: '유효하지 않거나 만료된 활성화 토큰입니다.' }))

  expect(await api.activate('old', 'pw')).toBe(false)
})

test('활성화의 다른 실패(409 이미 있는 계정)는 그대로 던진다', async () => {
  fetchMock.mockResolvedValue(json(409, { code: 'AUTH-002', message: '이미 등록된 이메일입니다.' }))

  await expect(api.activate('t1', 'pw')).rejects.toMatchObject({ status: 409, code: 'AUTH-002' })
})
