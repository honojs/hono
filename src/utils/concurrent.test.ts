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

  it('Should reject when an immediately-running task rejects', async () => {
    const pool = createPool({ concurrency: 2 })
    await expect(pool.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })

  it('Should release the slot when a task rejects', async () => {
    const pool = createPool({ concurrency: 1 })

    // The first task fails. If the slot is not released, the pool stays full forever.
    await expect(pool.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')

    // The next task must still be able to acquire the freed slot and run.
    await expect(
      Promise.race([
        pool.run(() => Promise.resolve('ok')),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('the pool slot was not released')), 1000)
        ),
      ])
    ).resolves.toBe('ok')
  })

  it('Should reject the caller when a queued task rejects', async () => {
    const pool = createPool({ concurrency: 1 })

    let release: () => void = () => {}
    const gate = new Promise<void>((r) => {
      release = r
    })

    // Occupy the only slot so the next task has to wait in the queue.
    const running = pool.run(() => gate.then(() => 'running'))

    // This task is queued. When it later rejects, the caller must observe the
    // rejection instead of hanging forever on a never-settled promise.
    const queued = pool.run(() => Promise.reject(new Error('queued boom')))

    release()

    await expect(running).resolves.toBe('running')
    await expect(
      Promise.race([
        queued,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('the caller was never notified')), 1000)
        ),
      ])
    ).rejects.toThrow('queued boom')
  })

  it('Should keep processing later tasks after a queued task rejects', async () => {
    const pool = createPool({ concurrency: 1 })

    let release: () => void = () => {}
    const gate = new Promise<void>((r) => {
      release = r
    })

    const running = pool.run(() => gate.then(() => 'running'))
    const rejecting = pool.run(() => Promise.reject(new Error('queued boom')))
    const following = pool.run(() => Promise.resolve('following'))

    release()

    await expect(running).resolves.toBe('running')
    await expect(rejecting).rejects.toThrow('queued boom')
    await expect(
      Promise.race([
        following,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('a later task never ran')), 1000)
        ),
      ])
    ).resolves.toBe('following')
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
