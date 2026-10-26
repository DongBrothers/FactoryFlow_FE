import type { Role } from '../api/client'

export const ROLE_LABEL: Record<Role, string> = {
  SALES: '영업',
  PURCHASE: '구매',
  PRODUCTION: '생산',
  ADMIN: '관리자',
}

type MenuGroup = { group: string; items: { path: string; label: string }[] }

const LOT = { group: '추적', items: [{ path: '/lots', label: 'LOT 추적' }] }

// 역할마다 자기 업무 메뉴만 (Figma 03 역할별 사이드바). 백엔드 조회 권한은 더 넓지만 화면은 이 표만 따른다
const MENU: Record<Role, MenuGroup[]> = {
  SALES: [
    {
      group: '영업',
      items: [
        { path: '/orders', label: '주문 목록' },
        { path: '/customers', label: '고객' },
      ],
    },
  ],
  PRODUCTION: [
    {
      group: '생산 계획',
      items: [
        { path: '/awaiting-release', label: '발행 대기' },
        { path: '/products', label: '제품·BOM' },
      ],
    },
    {
      group: '현장 (MES)',
      items: [
        { path: '/work-orders', label: '작업지시' },
        { path: '/equipments', label: '설비 현황' },
      ],
    },
    {
      group: '완성차',
      items: [
        { path: '/vehicles', label: '완성차·출고' },
        { path: '/storage-slots', label: '보관 위치' },
      ],
    },
    LOT,
  ],
  PURCHASE: [
    {
      group: '자재·구매',
      items: [
        { path: '/suggestions', label: '발주 제안' },
        { path: '/purchases', label: '구매·입고' },
        { path: '/parts', label: '부품 재고' },
        { path: '/suppliers', label: '공급업체' },
      ],
    },
    LOT,
  ],
  ADMIN: [],
}

const ADMIN_MENU: MenuGroup = {
  group: '관리자',
  items: [
    { path: '/admin/users', label: '계정 발급' },
    { path: '/admin/roles', label: '역할·권한' },
  ],
}

/**
 * 메뉴는 GET /api/auth/me 의 permissions 로 고른다 (관리자가 역할의 권한을 바꿀 수 있어서).
 * READ 면 자기 역할의 업무 메뉴, ACCOUNT_ADMIN 이면 관리자 메뉴
 */
export function menuOf(role: Role, permissions: string[]): MenuGroup[] {
  return [
    ...(permissions.includes('READ') ? (MENU[role] ?? []) : []),
    ...(permissions.includes('ACCOUNT_ADMIN') ? [ADMIN_MENU] : []),
  ]
}

/** 로그인 뒤 첫 화면 */
export const HOME: Record<Role, string> = {
  SALES: '/orders',
  PRODUCTION: '/work-orders',
  PURCHASE: '/suggestions',
  ADMIN: '/admin/users',
}

/** 첫 화면: 역할의 첫 화면이 메뉴에 있으면 그것, 없으면 보이는 첫 메뉴. 메뉴가 없으면 null */
export function homeOf(role: Role, permissions: string[]): string | null {
  const paths = menuOf(role, permissions).flatMap((g) => g.items.map((m) => m.path))
  return paths.includes(HOME[role]) ? HOME[role] : (paths[0] ?? null)
}
