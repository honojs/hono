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
      promise ||= new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      setTimeout(() => run(fn, promise, resolve, reject))
      return promise
    }
    const marker = {}
    pool.add(marker)
    try {
      const result = await fn()
      if (resolve) {
        resolve(result)
        return promise as Promise<T>
      }
      return result
    } catch (error) {
      // A parked task resumes here: its caller is awaiting the deferred `promise`,
      // so the rejection has to be forwarded instead of escaping as a floating
      // rejection that leaves `promise` pending forever.
      if (reject) {
        reject(error)
        return promise as Promise<T>
      }
      throw error
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
