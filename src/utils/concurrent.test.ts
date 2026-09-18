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

  describe('when a task throws', () => {
    test.each`
      concurrency
      ${1}
      ${2}
    `(
      'Should release the slot after a failure (concurrency $concurrency)',
      async ({ concurrency }) => {
        const pool = createPool({ concurrency })

        // Reject `concurrency` times: every slot must be given back, otherwise
        // the pool can never run another task again.
        for (let i = 0; i < concurrency; i++) {
          await expect(
            pool.run(async () => {
              throw new Error(`failure ${i}`)
            })
          ).rejects.toThrow(`failure ${i}`)
        }

        await expect(pool.run(async () => 'ok')).resolves.toBe('ok')
      }
    )

    it('Should reject a queued task instead of leaving it pending', async () => {
      const pool = createPool({ concurrency: 1 })

      let release: (() => void) | undefined
      const occupying = pool.run(
        () =>
          new Promise<void>((r) => {
            release = r
          })
      )

      // This task is queued because the only slot is occupied.
      const queued = pool.run(async () => {
        throw new Error('queued failure')
      })

      release?.()
      await occupying

      // The rejection has to reach the caller. It must not stay pending forever.
      await expect(queued).rejects.toThrow('queued failure')
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

    test.each`
      concurrency | interval
      ${1}        | ${10}
      ${2}        | ${10}
    `(
      'Should release the slot after a failure (concurrency $concurrency, interval $interval)',
      async ({ concurrency, interval }) => {
        const pool = createPool({ concurrency, interval })

        for (let i = 0; i < concurrency; i++) {
          await expect(
            pool.run(async () => {
              throw new Error(`failure ${i}`)
            })
          ).rejects.toThrow(`failure ${i}`)
        }

        // The slot is released after `interval`, so this task is parked until then.
        await expect(pool.run(async () => 'ok')).resolves.toBe('ok')
      }
    )
  })
})
