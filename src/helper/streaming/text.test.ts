import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { streamText } from '.'

describe('Text Streaming Helper', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Check streamText Response', async () => {
    const res = streamText(c, async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.write(`${i}`)
        await stream.sleep(1)
      }
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('transfer-encoding')).toBe('chunked')

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read()
      expect(decoder.decode(value)).toEqual(`${i}`)
    }
  })
})
