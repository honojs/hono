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

  describe('with a rejecting job', () => {
    test('releases the slot and rejects the caller when the job is not queued', async () => {
      const pool = createPool({ concurrency: 2 })

      await expect(pool.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')

      // If the slot from the failed job were never released, these would hang forever.
      const results = await Promise.all([pool.run(async () => 1), pool.run(async () => 2)])
      expect(results).toEqual([1, 2])
    })

    test('propagates the rejection to a queued caller instead of hanging', async () => {
      const pool = createPool({ concurrency: 1 })

      let releaseFirst: () => void
      const firstDone = new Promise<void>((r) => {
        releaseFirst = r
      })
      const first = pool.run(async () => {
        await firstDone
        return 'first'
      })
      // Queued immediately since concurrency is 1 and the first job is still running.
      const second = pool.run(() => Promise.reject(new Error('queued-boom')))

      releaseFirst!()

      await expect(first).resolves.toBe('first')
      await expect(second).rejects.toThrow('queued-boom')
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
