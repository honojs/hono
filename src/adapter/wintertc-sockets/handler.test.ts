import { Hono } from '../../hono'
import { createSocketHandler, serveSocket } from './handler'
import type { ServeSocketOptions, SocketBindings, SocketInfo, WinterTCSocket } from './types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const createSocketPair = (info: SocketInfo = { remoteAddress: '127.0.0.1:1234' }) => {
  const toServer = new TransformStream<Uint8Array, Uint8Array>()
  const toClient = new TransformStream<Uint8Array, Uint8Array>()
  const clientWriter = toServer.writable.getWriter()
  const socket: WinterTCSocket = {
    readable: toServer.readable,
    writable: toClient.writable,
    opened: Promise.resolve(info),
    close: vi.fn(async () => {}),
  }
  const readAll = async () => {
    let text = ''
    const reader = toClient.readable.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        return text
      }
      text += decoder.decode(value, { stream: true })
    }
  }
  return {
    socket,
    // writes are not awaited, they settle only once the server reads them
    send: (chunk: string | Uint8Array) =>
      void clientWriter
        .write(typeof chunk === 'string' ? encoder.encode(chunk) : chunk)
        .catch(() => {}),
    end: () => void clientWriter.close().catch(() => {}),
    readAll,
  }
}

const run = async (
  app: Hono,
  chunks: string | (string | Uint8Array)[],
  options?: ServeSocketOptions
) => {
  const pair = createSocketPair()
  const served = serveSocket(app, pair.socket, options)
  const output = pair.readAll()
  for (const chunk of typeof chunks === 'string' ? [chunks] : chunks) {
    pair.send(chunk)
  }
  pair.end()
  await served
  return { output: await output, socket: pair.socket }
}

const textResponse = (body: string, extra = '') =>
  'HTTP/1.1 200 \r\n' +
  'content-type: text/plain;charset=UTF-8\r\n' +
  'transfer-encoding: chunked\r\n' +
  extra +
  '\r\n' +
  (body ? `${body.length.toString(16)}\r\n${body}\r\n` : '') +
  '0\r\n\r\n'

describe('serveSocket', () => {
  const app = new Hono<{ Bindings: SocketBindings }>()
  app.get('/', (c) => c.text('Hello!'))
  app.get('/query', (c) => c.text(`${c.req.url} ${c.req.query('q')}`))
  app.post('/echo', async (c) => c.text(await c.req.text()))
  app.post('/stream', (c) => new Response(c.req.raw.body))
  app.post('/ignore', (c) => c.text('ignored'))
  app.get('/length', () => new Response('fixed', { headers: { 'content-length': '5' } }))
  app.get('/no-content', (c) => c.body(null, 204))
  app.get('/cookies', (c) => {
    c.header('set-cookie', 'a=1', { append: true })
    c.header('set-cookie', 'b=2', { append: true })
    return c.text('ok')
  })
  app.get('/env', (c) => c.text(`${c.env.info?.remoteAddress} ${typeof c.env.socket.close}`))
  app.get('/throw', () => {
    throw new Error('boom')
  })
  app.get('/stream-error', () => {
    let pulled = false
    const body = new ReadableStream({
      pull(controller) {
        if (pulled) {
          controller.error(new Error('boom'))
        } else {
          pulled = true
          controller.enqueue(encoder.encode('partial'))
        }
      },
    })
    return new Response(body)
  })

  it('Should serve a GET request and close the socket at the end of input', async () => {
    const { output, socket } = await run(app, 'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
    expect(output).toBe(textResponse('Hello!'))
    expect(socket.close).toHaveBeenCalledOnce()
  })

  it('Should build the URL from the Host header and the scheme', async () => {
    const { output } = await run(app, 'GET /query?q=1 HTTP/1.1\r\nHost: example.com:8080\r\n\r\n', {
      scheme: 'https',
    })
    expect(output).toContain('https://example.com:8080/query?q=1 1')
  })

  it('Should accept an absolute-form request target', async () => {
    const { output } = await run(
      app,
      'GET http://example.com/query?q=2 HTTP/1.1\r\nHost: example.com\r\n\r\n'
    )
    expect(output).toContain('http://example.com/query?q=2 2')
  })

  it('Should read a body with Content-Length', async () => {
    const { output } = await run(app, [
      'POST /echo HTTP/1.1\r\nHost: localhost\r\nContent-Length: 11\r\n\r\nhello',
      ' world',
    ])
    expect(output).toBe(textResponse('hello world'))
  })

  it('Should read a chunked body', async () => {
    const { output } = await run(
      app,
      'POST /echo HTTP/1.1\r\nHost: localhost\r\nTransfer-Encoding: chunked\r\n\r\n' +
        '5;ext=1\r\nhello\r\n6\r\n world\r\n0\r\nTrailer: x\r\n\r\n'
    )
    expect(output).toBe(textResponse('hello world'))
  })

  it('Should read a chunked body fed byte by byte', async () => {
    const request =
      'POST /echo HTTP/1.1\r\nHost: localhost\r\nTransfer-Encoding: chunked\r\n\r\n' +
      'a\r\n0123456789\r\n0\r\n\r\n'
    const { output } = await run(
      app,
      [...encoder.encode(request)].map((b) => Uint8Array.of(b))
    )
    expect(output).toBe(textResponse('0123456789'))
  })

  it('Should stream a request body into a response body', async () => {
    const { output } = await run(
      app,
      'POST /stream HTTP/1.1\r\nHost: localhost\r\nContent-Length: 3\r\n\r\nabc'
    )
    expect(output).toBe('HTTP/1.1 200 \r\ntransfer-encoding: chunked\r\n\r\n3\r\nabc\r\n0\r\n\r\n')
  })

  it('Should send a response with Content-Length as is', async () => {
    const { output } = await run(app, 'GET /length HTTP/1.1\r\nHost: localhost\r\n\r\n')
    expect(output).toBe(
      'HTTP/1.1 200 \r\ncontent-length: 5\r\ncontent-type: text/plain;charset=UTF-8\r\n\r\nfixed'
    )
  })

  it('Should serve pipelined requests on one connection', async () => {
    const { output } = await run(
      app,
      'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n' +
        'POST /echo HTTP/1.1\r\nHost: localhost\r\nContent-Length: 2\r\n\r\nhi' +
        '\r\nGET / HTTP/1.1\r\nHost: localhost\r\n\r\n'
    )
    expect(output).toBe(textResponse('Hello!') + textResponse('hi') + textResponse('Hello!'))
  })

  it('Should skip an unread request body before the next request', async () => {
    const { output } = await run(
      app,
      'POST /ignore HTTP/1.1\r\nHost: localhost\r\nContent-Length: 4\r\n\r\nbody' +
        'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n'
    )
    expect(output).toBe(textResponse('ignored') + textResponse('Hello!'))
  })

  it('Should consume a body sent with GET', async () => {
    const { output } = await run(
      app,
      'GET / HTTP/1.1\r\nHost: localhost\r\nContent-Length: 4\r\n\r\nbody' +
        'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n'
    )
    expect(output).toBe(textResponse('Hello!') + textResponse('Hello!'))
  })

  it('Should close the connection after `Connection: close`', async () => {
    const { output } = await run(
      app,
      'GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' +
        'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n'
    )
    expect(output).toBe(textResponse('Hello!', 'connection: close\r\n'))
  })

  it('Should close the connection when keepAlive is disabled', async () => {
    const { output } = await run(
      app,
      'GET / HTTP/1.1\r\nHost: localhost\r\n\r\nGET / HTTP/1.1\r\nHost: localhost\r\n\r\n',
      { keepAlive: false }
    )
    expect(output).toBe(textResponse('Hello!', 'connection: close\r\n'))
  })

  it('Should end an HTTP/1.0 response body by closing the connection', async () => {
    const { output } = await run(
      app,
      'GET / HTTP/1.0\r\nConnection: keep-alive\r\n\r\nGET / HTTP/1.0\r\n\r\n'
    )
    expect(output).toBe(
      'HTTP/1.1 200 \r\ncontent-type: text/plain;charset=UTF-8\r\nconnection: close\r\n\r\nHello!'
    )
  })

  it('Should keep an HTTP/1.0 connection alive when the length is known', async () => {
    const { output } = await run(
      app,
      'GET /length HTTP/1.0\r\nConnection: keep-alive\r\n\r\nGET /length HTTP/1.0\r\n\r\n'
    )
    const res = 'HTTP/1.1 200 \r\ncontent-length: 5\r\ncontent-type: text/plain;charset=UTF-8\r\n'
    expect(output).toBe(
      `${res}connection: keep-alive\r\n\r\nfixed${res}connection: close\r\n\r\nfixed`
    )
  })

  it('Should not send a body for HEAD', async () => {
    const { output } = await run(
      app,
      'HEAD /length HTTP/1.1\r\nHost: localhost\r\n\r\nHEAD / HTTP/1.1\r\nHost: localhost\r\n\r\n'
    )
    expect(output).toBe(
      'HTTP/1.1 200 \r\ncontent-length: 5\r\ncontent-type: text/plain;charset=UTF-8\r\n\r\n' +
        'HTTP/1.1 200 \r\ncontent-type: text/plain;charset=UTF-8\r\n\r\n'
    )
  })

  it('Should not send a body for 204', async () => {
    const { output } = await run(app, 'GET /no-content HTTP/1.1\r\nHost: localhost\r\n\r\n')
    expect(output).toBe('HTTP/1.1 204 \r\n\r\n')
  })

  it('Should send each Set-Cookie header on its own line', async () => {
    const { output } = await run(app, 'GET /cookies HTTP/1.1\r\nHost: localhost\r\n\r\n')
    expect(output).toContain('set-cookie: a=1\r\nset-cookie: b=2\r\n')
  })

  it('Should pass the socket and its info as env', async () => {
    const { output } = await run(app, 'GET /env HTTP/1.1\r\nHost: localhost\r\n\r\n')
    expect(output).toContain('127.0.0.1:1234 function')
  })

  it('Should merge options.env into env', async () => {
    const app = new Hono<{ Bindings: { NAME: string } }>()
    app.get('/', (c) => c.text(c.env.NAME))
    const { output } = await run(app as unknown as Hono, 'GET / HTTP/1.1\r\nHost: a\r\n\r\n', {
      env: { NAME: 'hono' },
    })
    expect(output).toBe(textResponse('hono'))
  })

  it('Should respond 500 when the handler throws', async () => {
    const { output } = await run(app, 'GET /throw HTTP/1.1\r\nHost: localhost\r\n\r\n')
    expect(output).toContain('HTTP/1.1 500 ')
  })

  it('Should close the connection when the response body errors', async () => {
    const { output, socket } = await run(
      app,
      'GET /stream-error HTTP/1.1\r\nHost: localhost\r\n\r\nGET / HTTP/1.1\r\nHost: localhost\r\n\r\n'
    )
    expect(output).toBe('HTTP/1.1 200 \r\ntransfer-encoding: chunked\r\n\r\n7\r\npartial\r\n')
    expect(socket.close).toHaveBeenCalledOnce()
  })

  describe('Expect: 100-continue', () => {
    it('Should send 100 Continue before reading the body', async () => {
      const { output } = await run(
        app,
        'POST /echo HTTP/1.1\r\nHost: localhost\r\nExpect: 100-continue\r\nContent-Length: 2\r\n\r\nhi'
      )
      expect(output).toBe('HTTP/1.1 100 Continue\r\n\r\n' + textResponse('hi'))
    })

    it('Should close instead of waiting for a body that was never requested', async () => {
      const { output } = await run(
        app,
        'POST /ignore HTTP/1.1\r\nHost: localhost\r\nExpect: 100-continue\r\nContent-Length: 2\r\n\r\n'
      )
      expect(output).toBe(textResponse('ignored'))
    })
  })

  describe('Malformed requests', () => {
    const errorResponse = (status: string) =>
      `HTTP/1.1 ${status}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`

    it.each([
      ['a malformed request line', 'GARBAGE\r\n\r\n', '400 Bad Request'],
      ['a missing Host header', 'GET / HTTP/1.1\r\n\r\n', '400 Bad Request'],
      ['a malformed Host header', 'GET / HTTP/1.1\r\nHost: a/b\r\n\r\n', '400 Bad Request'],
      ['a Host header with userinfo', 'GET / HTTP/1.1\r\nHost: a@b\r\n\r\n', '400 Bad Request'],
      ['a relative request target', 'GET foo HTTP/1.1\r\nHost: a\r\n\r\n', '400 Bad Request'],
      [
        'a malformed header',
        'GET / HTTP/1.1\r\nHost: a\r\nBad Header: 1\r\n\r\n',
        '400 Bad Request',
      ],
      ['obs-fold', 'GET / HTTP/1.1\r\nHost: a\r\n folded\r\n\r\n', '400 Bad Request'],
      [
        'both Content-Length and Transfer-Encoding',
        'POST /echo HTTP/1.1\r\nHost: a\r\nContent-Length: 1\r\nTransfer-Encoding: chunked\r\n\r\n',
        '400 Bad Request',
      ],
      [
        'conflicting Content-Length values',
        'POST /echo HTTP/1.1\r\nHost: a\r\nContent-Length: 1\r\nContent-Length: 2\r\n\r\n',
        '400 Bad Request',
      ],
      [
        'a non-numeric Content-Length',
        'POST /echo HTTP/1.1\r\nHost: a\r\nContent-Length: -1\r\n\r\n',
        '400 Bad Request',
      ],
      [
        'an unsupported Transfer-Encoding',
        'POST /echo HTTP/1.1\r\nHost: a\r\nTransfer-Encoding: gzip\r\n\r\n',
        '501 Not Implemented',
      ],
      [
        'an unsupported HTTP version',
        'GET / HTTP/2.0\r\nHost: a\r\n\r\n',
        '505 HTTP Version Not Supported',
      ],
    ])('Should respond to %s and close', async (_, request, status) => {
      const { output } = await run(app, [request, 'GET / HTTP/1.1\r\nHost: a\r\n\r\n'])
      expect(output).toBe(errorResponse(status))
    })

    it('Should respond 400 to a truncated head', async () => {
      const { output } = await run(app, 'GET / HTTP/1.1\r\nHost: a\r\n')
      expect(output).toBe(errorResponse('400 Bad Request'))
    })

    it('Should respond 431 to oversized headers', async () => {
      const { output } = await run(
        app,
        `GET / HTTP/1.1\r\nHost: a\r\nX-Big: ${'a'.repeat(200)}\r\n\r\n`,
        { maxHeaderSize: 100 }
      )
      expect(output).toBe(errorResponse('431 Request Header Fields Too Large'))
    })

    it('Should respond 431 before the end of oversized headers arrives', async () => {
      const pair = createSocketPair()
      const served = serveSocket(app, pair.socket, { maxHeaderSize: 100 })
      const output = pair.readAll()
      pair.send(`GET / HTTP/1.1\r\nX-Big: ${'a'.repeat(200)}`)
      await served
      expect(await output).toBe(errorResponse('431 Request Header Fields Too Large'))
    })

    it('Should not reuse the connection after a malformed chunked body', async () => {
      const { output } = await run(
        app,
        'POST /echo HTTP/1.1\r\nHost: a\r\nTransfer-Encoding: chunked\r\n\r\nzz\r\n' +
          'GET / HTTP/1.1\r\nHost: a\r\n\r\n'
      )
      expect(output).toContain('HTTP/1.1 500 ')
      expect(output).not.toContain('Hello!')
    })
  })

  it('Should do nothing when the socket fails to open', async () => {
    const pair = createSocketPair()
    const fetch = vi.spyOn(app, 'fetch')
    await serveSocket(app, { ...pair.socket, opened: Promise.reject(new Error('refused')) })
    expect(fetch).not.toHaveBeenCalled()
    fetch.mockRestore()
  })

  it('Should ignore leading empty lines and stop on empty input', async () => {
    const { output } = await run(app, ['\r\n\r\n', 'GET / HTTP/1.1\r\nHost: a\r\n\r\n', '\r\n'])
    expect(output).toBe(textResponse('Hello!'))
  })
})

describe('createSocketHandler', () => {
  it('Should serve each socket with the app', async () => {
    const app = new Hono()
    app.get('/', (c) => c.text('Hello!'))
    const handle = createSocketHandler(app)

    const pair = createSocketPair()
    const served = handle(pair.socket)
    const output = pair.readAll()
    pair.send('GET / HTTP/1.1\r\nHost: a\r\n\r\n')
    pair.end()
    await served
    expect(await output).toBe(textResponse('Hello!'))
  })
})
