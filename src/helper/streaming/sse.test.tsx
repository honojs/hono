/** @jsxImportSource ../../jsx */
import { Context } from '../../context'
import { ErrorBoundary } from '../../jsx'
import { streamSSE } from '.'

describe('SSE Streaming helper', () => {
  const req = new Request('http://localhost/')
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Check streamSSE Response', async () => {
    let spy
    const res = streamSSE(c, async (stream) => {
      spy = vi.spyOn(stream, 'close').mockImplementation(async () => {})

      let id = 0
      const maxIterations = 5

      while (id < maxIterations) {
        const message = `Message\nIt is ${id}`
        await stream.writeSSE({ data: message, event: 'time-update', id: String(id++) })
        await stream.sleep(10)
      }
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Transfer-Encoding')).toEqual('chunked')
    expect(res.headers.get('Content-Type')).toEqual('text/event-stream')
    expect(res.headers.get('Cache-Control')).toEqual('no-cache')
    expect(res.headers.get('Connection')).toEqual('keep-alive')

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (let i = 0; i < 5; i++) {
      const { value } = await reader.read()
      const decodedValue = decoder.decode(value)

      // Check the structure and content of the SSE message
      let expectedValue = 'event: time-update\n'
      expectedValue += 'data: Message\n'
      expectedValue += `data: It is ${i}\n`
      expectedValue += `id: ${i}\n\n`
      expect(decodedValue).toBe(expectedValue)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(spy).toHaveBeenCalled()
  })

  it('Check streamSSE Response if aborted by client', async () => {
    let aborted = false
    const res = streamSSE(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      for (let i = 0; i < 3; i++) {
        await stream.writeSSE({
          data: `Message ${i}`,
        })
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toEqual(new TextEncoder().encode('data: Message 0\n\n'))
    reader.cancel()
    expect(aborted).toBeTruthy()
  })

  it('Check streamSSE Response if aborted by abort signal', async () => {
    // Emulate an old version of Bun (version 1.1.0) for this specific test case
    // @ts-expect-error Bun is not typed
    global.Bun = {
      version: '1.1.0',
    }
    const ac = new AbortController()
    const req = new Request('http://localhost/', { signal: ac.signal })
    const c = new Context(req)

    let aborted = false
    const res = streamSSE(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      for (let i = 0; i < 3; i++) {
        await stream.writeSSE({
          data: `Message ${i}`,
        })
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toEqual(new TextEncoder().encode('data: Message 0\n\n'))
    ac.abort()
    expect(aborted).toBeTruthy()
  })

  it('Should include retry in the SSE message', async () => {
    const retryTime = 3000 // 3 seconds
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: 'This is a test message',
        retry: retryTime,
      })
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)

    // Check if the retry parameter is included in the SSE message
    const expectedRetryValue = `retry: ${retryTime}\n\n`
    expect(decodedValue).toContain(expectedRetryValue)
  })

  it('Check stream Response if error occurred', async () => {
    const onError = vi.fn()
    const res = streamSSE(
      c,
      async () => {
        throw new Error('Test error')
      },
      onError
    )
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)
    expect(decodedValue).toBe('event: error\ndata: Test error\n\n')
    expect(onError).toBeCalledTimes(1)
    expect(onError).toBeCalledWith(new Error('Test error'), expect.anything()) // 2nd argument is StreamingApi instance
  })

  it('Check streamSSE Response via Promise<string>', async () => {
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({ data: Promise.resolve('Async Message') })
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)
    expect(decodedValue).toBe('data: Async Message\n\n')
  })

  it('Check streamSSE Response via JSX.Element', async () => {
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({ data: <div>Hello</div> })
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)
    expect(decodedValue).toBe('data: <div>Hello</div>\n\n')
  })

  it('Check streamSSE Response via ErrorBoundary in success case', async () => {
    const AsyncComponent = async () => Promise.resolve(<div>Async Hello</div>)
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: (
          <ErrorBoundary fallback={<div>Error</div>}>
            <AsyncComponent />
          </ErrorBoundary>
        ),
      })
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)
    expect(decodedValue).toBe('data: <div>Async Hello</div>\n\n')
  })

  it('Check streamSSE Response via ErrorBoundary in error case', async () => {
    const AsyncComponent = async () => Promise.reject()
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: (
          <ErrorBoundary fallback={<div>Error</div>}>
            <AsyncComponent />
          </ErrorBoundary>
        ),
      })
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)
    expect(decodedValue).toBe('data: <div>Error</div>\n\n')
  })

  it('Check streamSSE handles \\r (CR) line ending correctly', async () => {
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: 'Line1\rLine2',
        event: 'test-cr',
      })
    })

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)

    expect(decodedValue).toBe('event: test-cr\ndata: Line1\ndata: Line2\n\n')
  })

  it('Check streamSSE handles \\r\\n (CRLF) line ending correctly', async () => {
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: 'Line1\r\nLine2',
        event: 'test-crlf',
      })
    })

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)

    expect(decodedValue).toBe('event: test-crlf\ndata: Line1\ndata: Line2\n\n')
  })

  it('Check streamSSE handles mixed line endings correctly', async () => {
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: 'A\nB\rC\r\nD',
        event: 'test-mixed',
      })
    })

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)

    expect(decodedValue).toBe('event: test-mixed\ndata: A\ndata: B\ndata: C\ndata: D\n\n')
  })

  it('Check streamSSE handles consecutive \\r correctly', async () => {
    const res = streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: 'Left\r\rRight',
        event: 'test-double-cr',
      })
    })

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const { value } = await reader.read()
    const decodedValue = decoder.decode(value)

    // Two \r should produce an empty line in between
    expect(decodedValue).toBe('event: test-double-cr\ndata: Left\ndata: \ndata: Right\n\n')
  })
})
