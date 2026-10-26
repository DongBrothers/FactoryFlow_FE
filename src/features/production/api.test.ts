import { beforeEach, expect, test, vi } from 'vitest'
import { getAwaitingRelease, refreshSize, releaseWorkOrder } from './api'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

const respond = (status: number, data: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ data, status, message: 'ok' }), { status }))

test('발행 대기 목록은 productionId 커서로 받는다', async () => {
  const page = { items: [], count: 0, last: true, nextCursor: null }
  respond(200, page)

  expect(await getAwaitingRelease(105, 20)).toEqual(page)
  expect(fetchMock.mock.calls[0][0]).toBe('/api/production/productions/awaiting-release?lastId=105&size=20')
})

test('작업지시 발행은 본문 없이 POST 하고 202 응답의 data 를 돌려준다', async () => {
  respond(202, { productionId: 101, releasedAt: '2026-10-26T10:00:00' })

  expect(await releaseWorkOrder(101)).toEqual({ productionId: 101, releasedAt: '2026-10-26T10:00:00' })
  const [path, init] = fetchMock.mock.calls[0]
  expect(path).toBe('/api/production/productions/101/work-order')
  expect(init.method).toBe('POST')
  expect(init.body).toBeUndefined()
})

test('폴링은 "더 보기" 로 펼친 만큼 처음부터 다시 받는다 (한 페이지 20, 상한 100)', () => {
  expect(refreshSize(0)).toBe(20)
  expect(refreshSize(3)).toBe(20)
  expect(refreshSize(40)).toBe(40)
  expect(refreshSize(140)).toBe(100)
})
