import { api } from '../../api/client'

/** 발급(대기)된 계정. 활성화 전이라 id 가 없다. role 은 역할 코드 */
export type IssueAccount = { email: string; name: string; role: string }

/** 역할과 그 권한. 관리자가 바꿀 수 있어 화면에 하드코딩하지 않는다 */
export type Role = { code: string; name: string; permissions: string[] }

export const issueAccount = (body: IssueAccount) =>
  api<IssueAccount>('/api/auth/admin/users', { method: 'POST', body: JSON.stringify(body) })

/** sort_order 순 */
export const getRoles = () => api<Role[]>('/api/auth/admin/roles')
