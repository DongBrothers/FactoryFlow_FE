import { useEffect, useState, type FormEvent } from 'react'
import { toast } from '../../layout/toast'
import { getRoles, issueAccount, type Role } from './api'
import styles from './IssueAccountPage.module.css'

/** 04 계정 발급. ADMIN 전용 */
export default function IssueAccountPage() {
  const [submitting, setSubmitting] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])

  useEffect(() => {
    // 실패 메시지는 api 가 토스트로 띄운다
    getRoles().then(setRoles, () => {})
  }, [])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    setSubmitting(true)
    try {
      const issued = await issueAccount({
        email: String(data.get('email')),
        name: String(data.get('name')),
        role: String(data.get('role')),
      })
      toast(`${issued.email} 로 활성화 메일을 보냈습니다`)
      form.reset() // 다음 사람을 바로 발급할 수 있게
    } catch {
      // 400·409·503 메시지는 api 가 토스트로 띄운다
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.card} onSubmit={submit}>
      <h2 className={styles.title}>계정 발급</h2>
      <label className={styles.field}>
        이메일
        <input name="email" type="email" maxLength={100} placeholder="name@gmail.com" required autoFocus />
      </label>
      <label className={styles.field}>
        이름
        <input name="name" maxLength={50} placeholder="홍길동" required />
      </label>
      <label className={styles.field}>
        역할
        <select name="role" required defaultValue="">
          <option value="" disabled>
            선택
          </option>
          {roles.map((role) => (
            <option key={role.code} value={role.code}>
              {role.name} {role.code}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? '보내는 중…' : '발급하고 활성화 메일 보내기'}
      </button>
      <p className={styles.help}>같은 이메일로 다시 발급하면 이전 링크는 무효가 됩니다. 링크는 24시간 유효합니다.</p>
    </form>
  )
}
