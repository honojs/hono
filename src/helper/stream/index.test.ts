import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { streamAsSSE } from '.'

describe('SSE Streaming', () => {
  it('streamAsSSE() should setup SSE stream correctly', async () => {
    const req = new HonoRequest(new Request('http://localhost/'))

    const res = streamAsSSE(new Context(req), async (stream) => {
      let id = 0
      const maxIterations = 5

      while (id < maxIterations) {
        const message = `It is ${new Date().toISOString()}`
        await stream.writeSse({ data: message, event: 'time-update', id: String(id++) })
        await stream.sleep(1000)
      }

      if (stream && typeof stream.close === 'function') {
        await stream.close()
      }
    })

    expect(res.status).toBe(200)
  })
})
