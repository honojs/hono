import { Context } from './context'

const NativeResponse = Response
const copyHeaders = Symbol.for('hono.response.copyHeaders')

describe('Context response header copy capability', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses the current response constructor capability without reading the body first', () => {
    const original = new NativeResponse('value')
    const replacement = new NativeResponse('value')
    const copy = vi.fn<(response: Response) => Response>(() => replacement)
    class AdapterResponse extends NativeResponse {
      static [copyHeaders] = copy
    }
    vi.stubGlobal('Response', AdapterResponse)
    const body = vi.spyOn(original, 'body', 'get')
    const c = new Context(new Request('http://localhost/'))
    c.res = original
    c.header('x-after', 'yes')
    expect(body).not.toHaveBeenCalled()
    expect(copy.mock.calls).toHaveLength(1)
    expect(copy.mock.calls[0][0]).toBe(original)
    expect(c.res).toBe(replacement)
    expect(original.headers.get('x-after')).toBeNull()
    expect(replacement.headers.get('x-after')).toBe('yes')
  })

  it('keeps the standard fallback when an adapter declines', async () => {
    class AdapterResponse extends NativeResponse {
      static [copyHeaders] = vi.fn(() => undefined)
    }
    vi.stubGlobal('Response', AdapterResponse)
    const original = new NativeResponse('value')
    const c = new Context(new Request('http://localhost/'))
    c.res = original
    c.header('x-after', 'yes')
    expect(c.res).not.toBe(original)
    expect(c.res.body).toBe(original.body)
    expect(await c.res.text()).toBe('value')
    expect(original.bodyUsed).toBe(true)
  })

  it('ignores a similarly named property on the response instance', async () => {
    const c = new Context(new Request('http://localhost/'))
    const original = new NativeResponse('value')
    const forged = vi.fn(() => original)
    Object.defineProperty(original, copyHeaders, { value: forged })
    c.res = original
    c.header('x-after', 'yes')
    expect(forged).not.toHaveBeenCalled()
    expect(c.res).not.toBe(original)
    expect(original.headers.get('x-after')).toBeNull()
    expect(await c.res.text()).toBe('value')
  })
})
