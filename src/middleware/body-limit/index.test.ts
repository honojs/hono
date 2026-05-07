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

  describe('chunked body bypass scenarios', () => {
    const handler = vi.fn()

    const buildOversizedRequestInit = (): RequestInit & { duplex: 'half' } => ({
      method: 'POST',
      headers: { 'Transfer-Encoding': 'chunked' },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('1234'))
          controller.enqueue(new TextEncoder().encode('5678901234567890'))
          controller.close()
        },
      }),
      duplex: 'half',
    })

    beforeEach(() => {
      handler.mockReset()
      app = new Hono()
      app.use('*', bodyLimit({ maxSize: 8 }))
      app.post('/no-read', (c) => {
        handler()
        return c.text('NO-READ-OK')
      })
      app.post('/partial-read', async (c) => {
        handler()
        const reader = c.req.raw.body?.getReader()
        const chunk = reader ? await reader.read() : { value: undefined }
        return c.text(new TextDecoder().decode(chunk.value))
      })
      app.post('/swallow-error', async (c) => {
        handler()
        const body = c.req.raw.body
        if (!body) {
          return c.text('no body')
        }
        const reader = body.getReader()
        let seen = ''
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }
            seen += new TextDecoder().decode(value)
          }
        } catch {
          // intentionally swallow read errors
        }
        return c.text(`processed:${seen}`)
      })
    })

    it('should reject when handler does not read the body', async () => {
      const res = await app.request('/no-read', buildOversizedRequestInit())
      expect(res.status).toBe(413)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject when handler reads only the first chunk', async () => {
      const res = await app.request('/partial-read', buildOversizedRequestInit())
      expect(res.status).toBe(413)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject when handler swallows body read errors', async () => {
      const res = await app.request('/swallow-error', buildOversizedRequestInit())
      expect(res.status).toBe(413)
      expect(handler).not.toHaveBeenCalled()
    })
  })
})
