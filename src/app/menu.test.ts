import { expect, test } from 'vitest'
import type { Role } from '../api/client'
import { canSee, HOME, homeOf, menuOf } from './menu'

const labels = (role: Role, permissions: string[]) => menuOf(role, permissions).flatMap((g) => g.items.map((m) => m.label))

test('READ 가 있으면 자기 역할의 업무 메뉴만 보인다 (Figma 00 역할과 메뉴)', () => {
  expect(labels('SALES', ['ORDER_WRITE', 'READ'])).toEqual(['주문 목록', '고객'])
  expect(labels('PRODUCTION', ['PRODUCTION_WRITE', 'READ'])).toEqual([
    '발행 대기',
    '제품·BOM',
    '작업지시',
    '설비 현황',
    '완성차·출고',
    '보관 위치',
    'LOT 추적',
  ])
  expect(labels('PURCHASE', ['PURCHASE_WRITE', 'READ'])).toEqual(['발주 제안', '구매·입고', '부품 재고', '공급업체', 'LOT 추적'])
})

test('ACCOUNT_ADMIN 이 있으면 계정 발급·역할·권한 메뉴가 보인다', () => {
  expect(labels('ADMIN', ['ACCOUNT_ADMIN'])).toEqual(['계정 발급', '역할·권한'])
})

test('권한은 관리자가 바꿀 수 있어 역할이 아니라 권한으로 고른다', () => {
  expect(labels('SALES', ['ORDER_WRITE'])).toEqual([])
  expect(labels('SALES', ['READ', 'ACCOUNT_ADMIN'])).toEqual(['주문 목록', '고객', '계정 발급', '역할·권한'])
  expect(labels('ADMIN', ['READ', 'ACCOUNT_ADMIN'])).toEqual(['계정 발급', '역할·권한'])
})

test('첫 화면은 역할의 첫 화면이고, 그 메뉴가 없으면 보이는 첫 메뉴, 메뉴가 없으면 null', () => {
  expect(homeOf('PURCHASE', ['READ'])).toBe('/suggestions')
  expect(homeOf('SALES', ['READ', 'ACCOUNT_ADMIN'])).toBe('/orders')
  expect(homeOf('SALES', ['ACCOUNT_ADMIN'])).toBe('/admin/users')
  expect(homeOf('SALES', [])).toBeNull()
})

test('쓰기 버튼은 역할이 아니라 권한으로 보인다 (Figma 00 쓰기 버튼)', () => {
  expect(canSee(['READ', 'PRODUCTION_WRITE'], 'releaseWorkOrder')).toBe(true)
  expect(canSee(['READ'], 'releaseWorkOrder')).toBe(false)
  expect(canSee(['READ', 'ORDER_WRITE'], 'releaseWorkOrder')).toBe(false)
})

test('처음 권한 그대로면 첫 화면은 그 역할의 메뉴 안에 있다', () => {
  const initial: Record<Role, string[]> = {
    SALES: ['ORDER_WRITE', 'READ'],
    PURCHASE: ['PURCHASE_WRITE', 'READ'],
    PRODUCTION: ['PRODUCTION_WRITE', 'READ'],
    ADMIN: ['ACCOUNT_ADMIN'],
  }
  for (const role of Object.keys(HOME) as Role[]) {
    expect(homeOf(role, initial[role])).toBe(HOME[role])
  }
})
