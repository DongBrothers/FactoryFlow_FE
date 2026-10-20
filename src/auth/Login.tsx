import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from './AuthProvider'
import { HOME } from '../app/menu'
import styles from './Login.module.css'

export default function Login() {
  const { role, login } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  if (role) return <Navigate to={HOME[role]} replace />

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    try {
      const next = await login(String(form.get('email')), String(form.get('password')))
      if (next) navigate(HOME[next], { replace: true })
    } catch {
      // 오류 메시지는 api 가 토스트로 띄운다
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <h1 className={styles.title}>FactoryFlow</h1>
        <label className={styles.field}>
          이메일
          <input name="email" type="email" autoComplete="username" required autoFocus />
        </label>
        <label className={styles.field}>
          비밀번호
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </main>
  )
}
