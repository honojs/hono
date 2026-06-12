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
    reject?: (reason: unknown) => void
  ): Promise<T> => {
    if (pool.size >= (concurrency as number)) {
      promise ||= new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      // The re-dispatched call settles `promise` via `resolve`/`reject`; its own
      // returned promise is unused, so swallow it to avoid an unhandled rejection.
      setTimeout(() => {
        run(fn, promise, resolve, reject).catch(() => {})
      })
      return promise
    }
    const marker = {}
    pool.add(marker)
    try {
      const result = await fn()
      // When this call is a re-dispatch of a queued task, settle the promise the
      // caller is awaiting and stop here so we don't surface a second result.
      if (resolve) {
        resolve(result)
        return promise as Promise<T>
      }
      return result
    } catch (e) {
      // Forward the rejection to the queued caller. If we are the original call
      // (not yet queued), rethrow so `run()` itself rejects.
      if (reject) {
        reject(e)
        return promise as Promise<T>
      }
      throw e
    } finally {
      // Always release the slot, even when `fn` rejects. Otherwise the marker
      // leaks: once `concurrency` tasks have thrown, the pool stays full forever
      // and every later task re-queues via setTimeout indefinitely.
      if (interval) {
        setTimeout(() => pool.delete(marker), interval)
      } else {
        pool.delete(marker)
      }
    }
  }
  return { run }
}
