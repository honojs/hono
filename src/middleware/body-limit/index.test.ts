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

  describe('Transfer-Encoding and Content-Length headers', () => {
    beforeEach(() => {
      app = new Hono()
      app.use('*', bodyLimit({ maxSize: 10 }))
      app.post('/test', async (c) => {
        return c.text(await c.req.text())
      })
    })

    it('should prioritize Transfer-Encoding over Content-Length', async () => {
      // Create a chunked body that exceeds the limit
      const largeContent = 'this is a large content that exceeds 10 bytes'
      const chunks = [largeContent.slice(0, 20), largeContent.slice(20)]

      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => {
            controller.enqueue(new TextEncoder().encode(chunk))
          })
          controller.close()
        },
      })

      const res = await app.request('/test', {
        method: 'POST',
        headers: {
          'Content-Length': '5', // Small content-length (bypass attempt)
          'Transfer-Encoding': 'chunked', // But chunked encoding with large content
        },
        body: stream,
        duplex: 'half',
      } as RequestInit)

      // Should reject based on actual chunked content size, not Content-Length
      expect(res.status).toBe(413)
    })

    it('should handle only Content-Length header correctly', async () => {
      const smallContent = 'small'
      const res = await app.request('/test', buildRequestInit({ body: smallContent }))

      expect(res.status).toBe(200)
      expect(await res.text()).toBe(smallContent)
    })

    it('should handle only Transfer-Encoding header correctly', async () => {
      const content = 'test'
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content))
          controller.close()
        },
      })

      const res = await app.request('/test', {
        method: 'POST',
        headers: {
          'Transfer-Encoding': 'chunked',
        },
        body: stream,
        duplex: 'half',
      } as RequestInit)

      expect(res.status).toBe(200)
      expect(await res.text()).toBe(content)
    })
  })
})
