import { Hono } from '../../hono'
import { bodyLimit } from '.'

const buildRequestInit = (init: RequestInit = {}): RequestInit & { duplex: 'half' } => {
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
    duplex: 'half',
  }
}

describe('Body Limit Middleware', () => {
  let app: Hono

  const exampleText = 'hono is so hot' // 14byte
  const exampleText2 = 'hono is so hot and cute' // 23byte

  beforeEach(() => {
    app = new Hono()
    app.use('*', bodyLimit({ maxSize: 14 }))
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
          maxSize: 15,
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
