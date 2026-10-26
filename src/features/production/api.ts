import { api, type CursorPage } from '../../api/client'

/** 작업지시 발행을 기다리는 생산 건 (부품이 다 잡힌 차 1대). 제품이 지워졌으면 코드·이름이 null */
export type AwaitingRelease = {
  productionId: number
  orderId: number
  productId: number
  productCode: string | null
  productName: string | null
  /** 그 주문·제품 안의 차량 번호 */
  seq: number
}

export type ReleaseWorkOrder = { productionId: number; releasedAt: string }

export const PAGE_SIZE = 20

// ponytail: 100 건 넘게 펼치면 폴링은 앞 100 건만 다시 받는다. 그만큼 쌓이면 폴링 방식을 바꾼다
/** 폴링은 "더 보기" 로 펼친 만큼 처음부터 다시 받는다 (size 상한 100) */
export const refreshSize = (loaded: number) => Math.min(Math.max(loaded, PAGE_SIZE), 100)

export const getAwaitingRelease = (lastId: number, size: number) =>
  api<CursorPage<AwaitingRelease>>(`/api/production/productions/awaiting-release?lastId=${lastId}&size=${size}`)

/** 202. 작업지시는 mes 가 이벤트를 받아 만든다 (잠깐은 08 목록에 없을 수 있다) */
export const releaseWorkOrder = (productionId: number) =>
  api<ReleaseWorkOrder>(`/api/production/productions/${productionId}/work-order`, { method: 'POST' })
