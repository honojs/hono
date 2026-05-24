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

  test('releases the slot when a task rejects (no permanent leak)', async () => {
    const pool = createPool({ concurrency: 1 })

    // A rejected task must still free its pool slot.
    await expect(pool.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')

    // Before the fix the slot was never released, so this second task queued forever.
    // Race against a timeout so the failure is a clean assertion, not a hung suite.
    const result = await Promise.race([
      pool.run(() => Promise.resolve('ok')),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('pool slot leaked — task never ran')), 1000)
      ),
    ])
    expect(result).toBe('ok')
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
