import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { activate } from '../api/client'
import { toast } from '../layout/toast'
import styles from './ActivationPage.module.css'

/** 02 계정 활성화. 메일 링크 /activate?token= 으로 들어오는 공개 화면 */
export default function ActivationPage() {
  const token = useSearchParams()[0].get('token')
  const navigate = useNavigate()
  const [expired, setExpired] = useState(!token)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const password = String(new FormData(form).get('password'))
    const confirm = form.elements.namedItem('confirm') as HTMLInputElement
    if (confirm.value !== password) {
      confirm.setCustomValidity('비밀번호가 서로 다릅니다.')
      confirm.reportValidity()
      return
    }
    setSubmitting(true)
    try {
      if (await activate(token!, password)) {
        toast('활성화되었습니다. 로그인하세요')
        navigate('/login', { replace: true })
      } else {
        setExpired(true)
      }
    } catch {
      // 409 등 나머지 오류 메시지는 api 가 토스트로 띄운다
    } finally {
      setSubmitting(false)
    }
  }

  if (expired) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <span className={styles.badge}>링크 오류</span>
          <h1 className={styles.subtitle}>링크가 만료되었거나 이미 사용되었습니다</h1>
          <p className={styles.help}>관리자에게 계정 재발급을 요청해 주세요. 다시 발급하면 새 링크가 메일로 갑니다.</p>
          <Link to="/login" className={styles.secondary}>
            로그인으로
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <form
        className={styles.card}
        onSubmit={submit}
        // 어느 칸이든 고치면 "다릅니다" 표시를 지운다 (제출 때 다시 비교)
        onInput={(e) => (e.currentTarget.elements.namedItem('confirm') as HTMLInputElement).setCustomValidity('')}
      >
        <h1 className={styles.title}>계정 활성화</h1>
        <p className={styles.help}>비밀번호를 정하면 계정이 활성화됩니다. 링크는 24시간 동안 유효합니다.</p>
        <label className={styles.field}>
          새 비밀번호
          <input name="password" type="password" autoComplete="new-password" required autoFocus />
        </label>
        <label className={styles.field}>
          비밀번호 확인
          <input name="confirm" type="password" autoComplete="new-password" required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? '활성화 중…' : '비밀번호 설정하고 활성화'}
        </button>
      </form>
    </main>
  )
}
