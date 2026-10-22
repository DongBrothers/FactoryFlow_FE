import { expect, test, vi } from 'vitest'
import { issueAccount } from './api'

test('계정 발급은 이메일·이름·역할을 보내고 발급된 계정을 돌려준다', async () => {
  const account = { email: 'kim@gmail.com', name: '김철수', role: 'PRODUCTION' }
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: account }), { status: 201 }))
  vi.stubGlobal('fetch', fetchMock)

  expect(await issueAccount({ email: 'Kim@gmail.com', name: '김철수', role: 'PRODUCTION' })).toEqual(account)
  const [path, init] = fetchMock.mock.calls[0]
  expect(path).toBe('/api/auth/admin/users')
  expect(init.method).toBe('POST')
  expect(JSON.parse(init.body)).toEqual({ email: 'Kim@gmail.com', name: '김철수', role: 'PRODUCTION' })
})
