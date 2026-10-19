import { Navigate, NavLink, useLocation, useNavigate } from 'react-router'
import { useAuth } from './auth'
import { HOME, menuOf, ROLE_LABEL } from './menu'
import styles from './Layout.module.css'

export default function Layout() {
  const { role, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (!role) return <Navigate to="/login" replace />
  const menu = menuOf(role)
  const current = menu.find((m) => m.path === pathname)
  // 역할 메뉴에 없는 주소(ADMIN 이 업무 화면 등)는 그 역할의 첫 화면으로
  if (!current) return <Navigate to={HOME[role]} replace />

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>FactoryFlow</div>
        {menu.map((m) => (
          <NavLink key={m.path} to={m.path} className={({ isActive }) => (isActive ? styles.active : styles.link)}>
            {m.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.body}>
        <header className={styles.header}>
          {/* 이름은 GET /api/auth/me 가 생기면 붙인다 */}
          <span>{ROLE_LABEL[role]}</span>
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
          <h1>{current.label}</h1>
          <p>준비 중</p>
        </main>
      </div>
    </div>
  )
}
