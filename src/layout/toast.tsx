import { useEffect, useState } from 'react'
import styles from './toast.module.css'

let push: (message: string) => void = () => {}

/** 화면 오른쪽 아래에 4초 동안 메시지를 띄운다. Toaster 가 그려져 있어야 보인다 */
export function toast(message: string) {
  push(message)
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([])

  useEffect(() => {
    let nextId = 0
    push = (message) => {
      const id = nextId++
      setItems((list) => [...list, { id, message }])
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000)
    }
    return () => {
      push = () => {}
    }
  }, [])

  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={styles.toast}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
