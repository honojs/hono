import { createPool } from './concurrent'

describe('concurrent execution', () => {
  test.each`
    concurrency | count
    ${1}        | ${10}
    ${10}       | ${10}
    ${100}      | ${10}
    ${Infinity} | ${2000}
  `('concurrency $concurrency, count $count', async ({ concurrency, count }) => {
    const running = new Set()

    const pool = createPool({ concurrency })
    let resolve: (() => void) | undefined
    const promise = new Promise<void>((r) => {
      resolve = r
    })
    const fn = async (i: number) => {
      if (running.size > concurrency) {
        throw new Error('concurrency exceeded')
      }

      running.add(i)
      await promise
      running.delete(i)
      return i
    }

    const jobs = new Array(count).fill(0).map((_, i) => () => fn(i))
    const expectedResults = new Array(count).fill(0).map((_, i) => i)
    const resultPromises = jobs.map((job) => pool.run(job))

    expect(running.size).toBe(Math.min(concurrency, count))
    resolve?.()
    const results = await Promise.all(resultPromises)
    expect(running.size).toBe(0)
    expect(results).toEqual(expectedResults)
  })

  describe('error handling', () => {
    it('should release the slot and propagate the error when fn throws', async () => {
      const pool = createPool({ concurrency: 1 })
      await expect(pool.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
      // the slot must have been released so a following task can run
      await expect(pool.run(() => Promise.resolve('ok'))).resolves.toBe('ok')
    })

    it('should reject the queued promise instead of hanging', async () => {
      const pool = createPool({ concurrency: 1 })
      let unblock!: () => void
      const blocker = new Promise<void>((r) => (unblock = r))

      const first = pool.run(() => blocker)
      const failing = pool.run(() => Promise.reject(new Error('queued boom')))
      const after = pool.run(() => Promise.resolve('after'))

      unblock()
      await first
      await expect(failing).rejects.toThrow('queued boom')
      await expect(after).resolves.toBe('after')
    })

    it('should not produce an unhandled rejection for a failing queued task', async () => {
      const pool = createPool({ concurrency: 1 })
      const unhandled = vi.fn()
      process.on('unhandledRejection', unhandled)
      try {
        let unblock!: () => void
        const blocker = new Promise<void>((r) => (unblock = r))

        const first = pool.run(() => blocker)
        const failing = pool.run(() => Promise.reject(new Error('queued boom')))

        unblock()
        await first
        await expect(failing).rejects.toThrow('queued boom')
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(unhandled).not.toHaveBeenCalled()
      } finally {
        process.off('unhandledRejection', unhandled)
      }
    })

    it('should release the slot on failure when interval is set', async () => {
      const pool = createPool({ concurrency: 1, interval: 5 })
      await expect(pool.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
      await expect(pool.run(() => Promise.resolve('ok'))).resolves.toBe('ok')
    })
  })

  describe('with interval', () => {
    test.each`
      concurrency | interval
      ${1}        | ${10}
      ${2}        | ${10}
    `('concurrency $concurrency, interval $interval', async ({ concurrency, interval }) => {
      const workingTimeQueue: number[] = []
      const pool = createPool({ concurrency, interval })
      const fn = async (i: number) => {
        const now = Date.now()
        if (workingTimeQueue.length >= concurrency) {
          const last = workingTimeQueue.shift()
          // Not so accurate, -1 ms is acceptable
          if (last && now - last < interval - 1) {
            throw new Error('interval violated')
          }
        }
        workingTimeQueue.push(now)
        return i
      }

      const jobs = new Array(10).fill(0).map((_, i) => () => fn(i))
      const expectedResults = new Array(10).fill(0).map((_, i) => i)
      const resultPromises = jobs.map((job) => pool.run(job))

      const results = await Promise.all(resultPromises)
      expect(results).toEqual(expectedResults)
    })
  })
})
