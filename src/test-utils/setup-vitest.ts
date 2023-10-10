// @denoify-ignore
import crypto from 'node:crypto'
import { vi } from 'vitest'

/**
 * crypto
 */
vi.stubGlobal('crypto', crypto)

/**
 * Cache API
 */
type StoreMap = Map<string | Request, Response>

class MockCache {
  name: string
  store: StoreMap

  constructor(name: string, store: StoreMap) {
    this.name = name
    this.store = store
  }

  async match(key: Request | string): Promise<Response | null> {
    return this.store.get(key) || null
  }

  async put(key: Request | string, response: Response): Promise<void> {
    this.store.set(key, response)
  }
}

const globalStore: Map<string | Request, Response> = new Map()

const caches = {
  open: (name: string) => {
    return new MockCache(name, globalStore)
  },
}

vi.stubGlobal('caches', caches)
