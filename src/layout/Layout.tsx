import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { homeOf, menuOf, ROLE_LABEL } from '../app/menu'
import styles from './Layout.module.css'

export default function Layout() {
  const { role, me, meFailed, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (!role) return <Navigate to="/login" replace />
  if (meFailed) return <p className={styles.notice}>내 정보를 불러오지 못했습니다. 새로고침해 주세요.</p>
  if (!me) return null
  const menu = menuOf(role, me.permissions)
  const home = homeOf(role, me.permissions)
  if (!home) return <p className={styles.notice}>볼 수 있는 메뉴가 없습니다. 관리자에게 권한을 요청해 주세요.</p>
  const current = menu.flatMap((g) => g.items).find((m) => m.path === pathname)
  // 메뉴에 없는 주소(ADMIN 이 업무 화면 등)는 첫 화면으로
  if (!current) return <Navigate to={home} replace />

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>FactoryFlow</div>
        {menu.map((g) => (
          <div key={g.group} className={styles.group}>
            <div className={styles.groupLabel}>{g.group}</div>
            {g.items.map((m) => (
              <NavLink key={m.path} to={m.path} className={({ isActive }) => (isActive ? styles.active : styles.link)}>
                {m.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className={styles.body}>
        <header className={styles.header}>
          <h1 className={styles.title}>{current.label}</h1>
          <span>
            {me.name} · {ROLE_LABEL[role]}
          </span>
          <button
            className={styles.logout}
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
          >
            로그아웃
          </button>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
