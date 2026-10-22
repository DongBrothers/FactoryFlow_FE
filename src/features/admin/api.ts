import { api, type Role } from '../../api/client'

/** 발급(대기)된 계정. 활성화 전이라 id 가 없다 */
export type IssueAccount = { email: string; name: string; role: Role }

export const issueAccount = (body: IssueAccount) =>
  api<IssueAccount>('/api/auth/admin/users', { method: 'POST', body: JSON.stringify(body) })
