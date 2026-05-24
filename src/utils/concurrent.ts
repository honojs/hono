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
    resolve?: (result: T) => void
  ): Promise<T> => {
    if (pool.size >= (concurrency as number)) {
      promise ||= new Promise<T>((r) => (resolve = r))
      setTimeout(() => run(fn, promise, resolve))
      return promise
    }
    const marker = {}
    pool.add(marker)
    try {
      const result = await fn()
      if (resolve) {
        resolve(result)
        return promise as Promise<T>
      } else {
        return result
      }
    } finally {
      // Release the slot even when `fn` throws. Without this, a rejected task
      // leaks its marker permanently; once `concurrency` tasks have thrown the
      // pool is full forever and every later task queues via setTimeout endlessly.
      if (interval) {
        setTimeout(() => pool.delete(marker), interval)
      } else {
        pool.delete(marker)
      }
    }
  }
  return { run }
}
