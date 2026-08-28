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
      if (!promise) {
        promise = new Promise<T>((res, rej) => {
          resolve = res
          reject = rej
        })
      }
      setTimeout(() => {
        // `run`'s own returned promise settles to the same state as `promise` (which the
        // caller already awaits with its own handler), so swallow it here to avoid a
        // duplicate unhandled-rejection warning when the job fails.
        run(fn, promise, resolve, reject).catch(() => {})
      })
      return promise
    }
    const marker = {}
    pool.add(marker)
    const release = () => {
      if (interval) {
        setTimeout(() => pool.delete(marker), interval)
      } else {
        pool.delete(marker)
      }
    }
    try {
      const result = await fn()
      release()
      if (resolve) {
        resolve(result)
        return promise as Promise<T>
      } else {
        return result
      }
    } catch (e) {
      release()
      if (reject) {
        reject(e)
        return promise as Promise<T>
      } else {
        throw e
      }
    }
  }
  return { run }
}
