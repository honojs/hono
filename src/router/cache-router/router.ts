import { METHOD_NAME_ALL } from '../../router'
import type { Result, Router } from '../../router'

type CacheId = `${string}__${string}` // `${method}__${path}` e.g. `GET__/hello`

export class CacheRouter<T> implements Router<T> {
  name: string = 'CacheRouter'
  #router: Router<T>
  #maxCacheEntries: number
  #cache: Map<CacheId, Result<T>>
  #checkDiffOnAdd: boolean
  constructor(init: { router: Router<T>; maxCacheEntries?: number; checkDiffOnAdd?: boolean }) {
    this.#router = init.router
    init.maxCacheEntries ??= 100
    if (init.maxCacheEntries <= 0) {
      throw new TypeError(
        'maxCacheEnries must be positive. if you want to cache infinity,use `Infinity`.'
      )
    }
    this.#maxCacheEntries = init.maxCacheEntries
    this.#cache = new Map()
    init.checkDiffOnAdd ??= false
    this.#checkDiffOnAdd = init.checkDiffOnAdd
  }
  add(method: string, path: string, handler: T): void {
    if (this.#checkDiffOnAdd) {
      if (method === METHOD_NAME_ALL) {
        this.#cache.clear()
      } else {
        for (const cacheId of this.#cache.keys()) {
          const [cacheMethod] = cacheId.split('__')
          if (cacheMethod === method) {
            this.#cache.delete(cacheId)
          }
        }
      }
    } else {
      this.#cache.clear()
    }
    this.#router.add(method, path, handler)
  }
  match(method: string, path: string): Result<T> {
    const id: CacheId = `${method}__${path}`
    const cacheOrUndefind = this.#cache.get(id)
    if (cacheOrUndefind) {
      return cacheOrUndefind
    }
    // case: not found cache.
    const result = this.#router.match(method, path)
    if (this.#cache.size >= this.#maxCacheEntries) {
      this.#cache.delete(this.#cache.keys().next().value!) // delete first(old) cache
    }
    this.#cache.set(id, result)
    return result
  }
}
