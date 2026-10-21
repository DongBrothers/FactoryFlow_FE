import { expect, test } from 'vitest'
import type { Role } from '../api/client'
import { HOME, menuOf } from './menu'

const labels = (role: Role) => menuOf(role).flatMap((g) => g.items.map((m) => m.label))

test('역할마다 자기 업무 메뉴만 보인다 (Figma 03 역할별 사이드바)', () => {
  expect(labels('SALES')).toEqual(['주문 목록', '고객'])
  expect(labels('PRODUCTION')).toEqual([
    '발행 대기',
    '제품·BOM',
    '작업지시',
    '설비 현황',
    '완성차·출고',
    '보관 위치',
    'LOT 추적',
  ])
  expect(labels('PURCHASE')).toEqual(['부족 부품', '구매·입고', '부품 재고', '공급업체', 'LOT 추적'])
  expect(labels('ADMIN')).toEqual(['계정 발급'])
})

test('첫 화면은 그 역할의 메뉴 안에 있다', () => {
  for (const role of Object.keys(HOME) as Role[]) {
    expect(menuOf(role).flatMap((g) => g.items.map((m) => m.path))).toContain(HOME[role])
  }
})
