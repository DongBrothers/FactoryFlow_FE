import { useCallback, useEffect, useRef, useState } from 'react'
import type { CursorPage } from '../../api/client'
import { canSee } from '../../app/menu'
import { useAuth } from '../../auth/AuthProvider'
import { toast } from '../../layout/toast'
import { getAwaitingRelease, PAGE_SIZE, refreshSize, releaseWorkOrder, type AwaitingRelease } from './api'
import styles from './AwaitingReleasePage.module.css'

const POLL_MS = 30_000

const productLabel = (p: AwaitingRelease) => (p.productName ? `${p.productName} · ${p.productCode}` : `제품 ${p.productId}`)

/** 17 작업지시 발행 대기 + 17-1 발행 확인 모달 */
export default function AwaitingReleasePage() {
  const { me } = useAuth()
  const [page, setPage] = useState<CursorPage<AwaitingRelease>>()
  const [target, setTarget] = useState<AwaitingRelease | null>(null)
  const [releasing, setReleasing] = useState(false)
  // 폴링이 "더 보기" 로 펼친 만큼 다시 받도록, 지금 보이는 개수를 기억한다
  const loaded = useRef(0)
  const dialog = useRef<HTMLDialogElement>(null)

  const show = (next: CursorPage<AwaitingRelease>) => {
    loaded.current = next.items.length
    setPage(next)
  }

  // 실패 메시지는 api 가 토스트로 띄운다
  const reload = useCallback(() => {
    getAwaitingRelease(0, refreshSize(loaded.current)).then(show, () => {})
  }, [])

  const more = () => {
    if (!page?.nextCursor) return
    getAwaitingRelease(page.nextCursor, PAGE_SIZE).then(
      (next) => show({ ...next, items: [...page.items, ...next.items], count: page.count + next.count }),
      () => {},
    )
  }

  useEffect(() => {
    reload()
    const timer = setInterval(reload, POLL_MS)
    return () => clearInterval(timer)
  }, [reload])

  useEffect(() => {
    if (target) dialog.current?.showModal()
    else dialog.current?.close()
  }, [target])

  const release = async () => {
    if (!target) return
    setReleasing(true)
    try {
      await releaseWorkOrder(target.productionId)
      toast('작업지시를 발행했습니다')
    } catch {
      // 409·404 는 api 가 토스트로 띄운다. 다른 사람이 먼저 발행했거나 주문이 취소됐을 수 있어 목록을 다시 본다
    } finally {
      setReleasing(false)
      setTarget(null)
      reload()
    }
  }

  const canRelease = canSee(me?.permissions ?? [], 'releaseWorkOrder')

  return (
    <>
      <p className={styles.poll}>30초마다 자동 갱신</p>
      {page && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>생산 건</th>
              <th>주문</th>
              <th className={styles.wide}>제품</th>
              <th>주문 안 순번</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {page.items.map((p) => (
              <tr key={p.productionId}>
                <td>#{p.productionId}</td>
                <td>주문 id {p.orderId}</td>
                <td>{productLabel(p)}</td>
                <td>{p.seq}번째 차</td>
                <td>{canRelease && <button onClick={() => setTarget(p)}>발행</button>}</td>
              </tr>
            ))}
            {page.items.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  작업지시를 기다리는 차가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {page && !page.last && (
        <div className={styles.more}>
          <button className={styles.secondary} onClick={more}>
            더 보기
          </button>
        </div>
      )}

      <dialog ref={dialog} className={styles.modal} onClose={() => setTarget(null)}>
        {target && (
          <>
            <h2 className={styles.modalTitle}>
              생산 건 #{target.productionId} ({target.productName ?? `제품 ${target.productId}`}) 의 작업지시를 발행할까요?
            </h2>
            <p className={styles.modalText}>
              발행하면 현장(MES) 작업지시 목록에 나오고, 프레스가 비면 바로 시작됩니다. 첫 공정을 시작하기 전까지는 주문
              취소로 취소될 수 있습니다.
            </p>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={() => setTarget(null)} disabled={releasing}>
                취소
              </button>
              <button onClick={release} disabled={releasing}>
                {releasing ? '발행 중…' : '발행'}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
