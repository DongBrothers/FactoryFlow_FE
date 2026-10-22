import { beforeEach } from 'vitest'

// Node 에는 localStorage 가 없어 Map 으로 흉내 낸다. 테스트마다 비운다
const items = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key) => items.get(key) ?? null,
  setItem: (key, value) => void items.set(key, String(value)),
  removeItem: (key) => void items.delete(key),
  clear: () => items.clear(),
  key: (i) => [...items.keys()][i] ?? null,
  get length() {
    return items.size
  },
}
beforeEach(() => items.clear())
