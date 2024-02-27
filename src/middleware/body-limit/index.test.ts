import { Hono } from '../../hono'
import { Unit, bodyLimit } from '.'

const GlobalRequest = globalThis.Request
globalThis.Request = class Request extends GlobalRequest {
  constructor(input: Request | string, init: RequestInit) {
    if (init) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(init as any).duplex ??= 'half'
    }
    super(input, init)
  }
} as typeof GlobalRequest

const buildRequestInit = (init: RequestInit = {}): RequestInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
  }
  if (typeof init.body === 'string') {
    headers['Content-Length'] = init.body.length.toString()
  }
  return {
    method: 'POST',
    headers,
    body: null,
    ...init,
  }
}

describe('Body Limit Middleware', () => {
  let app: Hono

  const exampleText = 'hono is so cool' // 15byte
  const exampleText2 = 'hono is so cool and cute' // 24byte

  beforeEach(() => {
    app = new Hono()
    app.use('*', bodyLimit({ maxSize: 15 * Unit.b }))
    app.get('/', (c) => c.text('index'))
    app.post('/body-limit-15byte', async (c) => {
      return c.text(await c.req.raw.text())
    })
  })

  describe('GET request', () => {
    it('should return 200 response', async () => {
      const res = await app.request('/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('index')
    })
  })

  describe('POST request', () => {
    describe('string body', () => {
      it('should return 200 response', async () => {
        const res = await app.request('/body-limit-15byte', buildRequestInit({ body: exampleText }))

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(await res.text()).toBe(exampleText)
      })

      it('should return 413 response', async () => {
        const res = await app.request(
          '/body-limit-15byte',
          buildRequestInit({ body: exampleText2 })
        )

        expect(res).not.toBeNull()
        expect(res.status).toBe(413)
        expect(await res.text()).toBe('Payload Too Large')
      })
    })

    describe('ReadableStream body', () => {
      it('should return 200 response', async () => {
        const contents = ['a', 'b', 'c']
        const stream = new ReadableStream({
          start(controller) {
            while (contents.length) {
              controller.enqueue(new TextEncoder().encode(contents.shift() as string))
            }
            controller.close()
          },
        })
        const res = await app.request('/body-limit-15byte', buildRequestInit({ body: stream }))

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('abc')
      })

      it('should return 413 response', async () => {
        const readSpy = vi.fn().mockImplementation(() => {
          return {
            done: false,
            value: new TextEncoder().encode(exampleText),
          }
        })
        const stream = new ReadableStream()
        vi.spyOn(stream, 'getReader').mockReturnValue({
          read: readSpy,
        } as unknown as ReadableStreamDefaultReader)
        const res = await app.request('/body-limit-15byte', buildRequestInit({ body: stream }))

        expect(res).not.toBeNull()
        expect(res.status).toBe(413)
        expect(readSpy).toHaveBeenCalledTimes(2)
        expect(await res.text()).toBe('Payload Too Large')
      })
    })
  })

  describe('custom error handler', () => {
    beforeEach(() => {
      app = new Hono()
      app.post(
        '/text-limit-15byte-custom',
        bodyLimit({
          maxSize: 15 * Unit.b,
          onError: (c) => {
            return c.text('no', 413)
          },
        }),
        (c) => {
          return c.text('yes')
        }
      )
    })

    it('should return the custom error handler', async () => {
      const res = await app.request(
        '/text-limit-15byte-custom',
        buildRequestInit({ body: exampleText2 })
      )

      expect(res).not.toBeNull()
      expect(res.status).toBe(413)
      expect(await res.text()).toBe('no')
    })
  })
})

describe('Unit', () => {
  it('should return the correct size', () => {
    let beforeSize = 1 / 1024

    for (let i = 0, keys = Object.keys(Unit), len = keys.length; i < len; i++) {
      // @ts-expect-error: <safe access>
      const size = Unit[keys[i]]
      expect(size === beforeSize * 1024).toBeTruthy()
      beforeSize = size
    }
  })
})
