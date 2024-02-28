import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { streamSSE } from '.'

describe('SSE Streaming helper', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Check streamSSE Response', async () => {
    const res = streamSSE(c, async (stream) => {
      let id = 0
      const maxIterations = 5

      while (id < maxIterations) {
        const message = `Message\nIt is ${id}`
        await stream.writeSSE({ data: message, event: 'time-update', id: String(id++) })
        await stream.sleep(100)
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
