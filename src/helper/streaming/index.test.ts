import { Hono } from '../../hono'
import { streamSSE } from '.'

describe('SSE Streaming headers', () => {
  it('Check SSE Response', async () => {
    const app = new Hono()
    app.get('/sse', async (c) => {
      return streamSSE(c, async (stream) => {
        let id = 0
        const maxIterations = 5

        while (id < maxIterations) {
          const message = `It is ${id}`
          await stream.writeSSE({ data: message, event: 'time-update', id: String(id++) })
          await stream.sleep(1000)
        }
      })
    })

    const res = await app.request('/sse')
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
      expect(decodedValue).toContain(`id: ${i}`)
      expect(decodedValue).toContain('event: time-update')
      expect(decodedValue).toContain(`data: It is ${i}`)
    }
  })
})
