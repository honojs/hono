import { Context } from '../../context'
import { stream } from '.'

describe('Basic Streaming Helper', () => {
  const req = new Request('http://localhost/')
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Check stream Response', async () => {
    const res = stream(c, async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read()
      expect(value).toEqual(new Uint8Array([i]))
    }
  })

  it('Check stream Response if aborted by client', async () => {
    let aborted = false
    const res = stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toEqual(new Uint8Array([0]))
    reader.cancel()
    expect(aborted).toBeTruthy()
  })

  it('Check stream Response if aborted by abort signal', async () => {
    // Emulate an old version of Bun (version 1.1.0) for this specific test case
    // @ts-expect-error Bun is not typed
    global.Bun = {
      version: '1.1.0',
    }
    const ac = new AbortController()
    const req = new Request('http://localhost/', { signal: ac.signal })
    const c = new Context(req)

    let aborted = false
    const res = stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toEqual(new Uint8Array([0]))
    ac.abort()
    expect(aborted).toBeTruthy()
    // @ts-expect-error Bun is not typed
    delete global.Bun
  })

  it('Check stream Response if pipe is aborted by abort signal', async () => {
    // Emulate an old version of Bun (version 1.1.0) for this specific test case
    // @ts-expect-error Bun is not typed
    global.Bun = {
      version: '1.1.0',
    }
    const ac = new AbortController()
    const req = new Request('http://localhost/', { signal: ac.signal })
    const c = new Context(req)

    let aborted = false
    const res = stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      await stream.pipe(new ReadableStream())
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const pReading = reader.read()
    ac.abort()
    await pReading
    expect(aborted).toBeTruthy()
    // @ts-expect-error Bun is not typed
    delete global.Bun
  })

  it('Check stream Response if error occurred', async () => {
    const onError = vi.fn()
    const res = stream(
      c,
      async () => {
        throw new Error('error')
      },
      onError
    )
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toBeUndefined()
    expect(onError).toBeCalledTimes(1)
    expect(onError).toBeCalledWith(new Error('error'), expect.anything()) // 2nd argument is StreamingApi instance
  })
})
