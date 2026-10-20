import type { Role } from '../api/client'

export const ROLE_LABEL: Record<Role, string> = {
  SALES: '영업',
  PURCHASE: '구매',
  PRODUCTION: '생산',
  ADMIN: '관리자',
}

// 업무 역할 3개는 같은 메뉴(조회는 모두 가능), ADMIN 은 계정 발급만
const WORK_MENU = [
  { path: '/orders', label: '주문' },
  { path: '/work-orders', label: '작업지시' },
  { path: '/equipments', label: '설비 현황' },
  { path: '/vehicles', label: '완성차' },
  { path: '/parts', label: '부품 재고' },
  { path: '/shortages', label: '부족 부품' },
  { path: '/purchases', label: '구매' },
  { path: '/lots', label: 'LOT 추적' },
]
const ADMIN_MENU = [{ path: '/admin/users', label: '계정 발급' }]

export const menuOf = (role: Role) => (role === 'ADMIN' ? ADMIN_MENU : WORK_MENU)

/** 로그인 뒤 첫 화면 */
export const HOME: Record<Role, string> = {
  SALES: '/orders',
  PRODUCTION: '/work-orders',
  PURCHASE: '/shortages',
  ADMIN: '/admin/users',
}
