/**
 * @module
 * Concurrent utility.
 */

const DEFAULT_CONCURRENCY = 1024

export interface Pool {
  run<T>(fn: () => T): Promise<T>
}

export const createPool = ({
  concurrency,
  interval,
}: {
  concurrency?: number
  interval?: number
} = {}): Pool => {
  concurrency ||= DEFAULT_CONCURRENCY

  if (concurrency === Infinity) {
    // unlimited
    return {
      run: async (fn) => fn(),
    }
  }

  const pool: Set<{}> = new Set()
  const run = async <T>(
    fn: () => T,
    promise?: Promise<T>,
    resolve?: (result: T) => void,
    reject?: (reason?: unknown) => void
  ): Promise<T> => {
    if (pool.size >= (concurrency as number)) {
      if (!promise) {
        promise = new Promise<T>((res, rej) => {
          resolve = res
          reject = rej
        })
      }
      setTimeout(() => run(fn, promise, resolve, reject))
      return promise
    }
    const marker = {}
    pool.add(marker)
    try {
      const result = await fn()
      resolve?.(result)
      return promise ?? result
    } catch (e) {
      if (promise && reject) {
        reject(e)
        // the queued caller's promise already carries the rejection, so resolve
        // this invocation instead of returning it to keep the floating retry
        // from surfacing a second, unhandled rejection
        return promise.catch(() => undefined as T)
      }
      throw e
    } finally {
      if (interval) {
        setTimeout(() => pool.delete(marker), interval)
      } else {
        pool.delete(marker)
      }
    }
  }
  return { run }
}
