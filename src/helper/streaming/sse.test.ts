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
})
