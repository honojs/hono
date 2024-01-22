import { Hono } from '../..'
import type { Accept, acceptsConfig, acceptsOptions } from './accepts'
import { parseAccept, defaultMatch, accepts } from './accepts'

describe('parseAccept', () => {
  test('should parse accept header', () => {
    const acceptHeader =
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8;level=1;foo=bar'
    const accepts = parseAccept(acceptHeader)
    expect(accepts).toEqual([
      { type: 'text/html', params: {}, q: 1 },
      { type: 'application/xhtml+xml', params: {}, q: 1 },
      { type: 'application/xml', params: { q: '0.9' }, q: 0.9 },
      { type: 'image/webp', params: {}, q: 1 },
      { type: '*/*', params: { q: '0.8', level: '1', foo: 'bar' }, q: 0.8 },
    ])
  })
})

describe('defaultMatch', () => {
  test('should return default support', () => {
    const accepts: Accept[] = [
      { type: 'text/html', params: {}, q: 1 },
      { type: 'application/xhtml+xml', params: {}, q: 1 },
      { type: 'application/xml', params: { q: '0.9' }, q: 0.9 },
      { type: 'image/webp', params: {}, q: 1 },
      { type: '*/*', params: { q: '0.8' }, q: 0.8 },
    ]
    const config: acceptsConfig = {
      header: 'Accept',
      supports: ['text/html'],
      default: 'text/html',
    }
    const result = defaultMatch(accepts, config)
    expect(result).toBe('text/html')
  })
})

describe('accepts', () => {
  test('should return matched support', () => {
    const c = {
      req: {
        header: () => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const options: acceptsConfig = {
      header: 'Accept',
      supports: ['application/xml', 'text/html'],
      default: 'application/json',
    }
    const result = accepts(c, options)
    expect(result).toBe('text/html')
  })

  test('should return default support if no matched support', () => {
    const c = {
      req: {
        header: () => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const options: acceptsConfig = {
      header: 'Accept',
      supports: ['application/json'],
      default: 'text/html',
    }
    const result = accepts(c, options)
    expect(result).toBe('text/html')
  })

  test('should return default support if no accept header', () => {
    const c = {
      req: {
        header: () => undefined,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const options: acceptsConfig = {
      header: 'Accept',
      supports: ['application/json'],
      default: 'text/html',
    }
    const result = accepts(c, options)
    expect(result).toBe('text/html')
  })

  test('should return matched support with custom match function', () => {
    const c = {
      req: {
        header: () => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    // this match function will return the least q value
    const match = (accepts: Accept[], config: acceptsConfig) => {
      const { supports, default: defaultSupport } = config
      const accept = accepts
        .sort((a, b) => a.q - b.q)
        .find((accept) => supports.includes(accept.type))
      return accept ? accept.type : defaultSupport
    }
    const options: acceptsOptions = {
      header: 'Accept',
      supports: ['application/xml', 'text/html'],
      default: 'application/json',
      match,
    }
    const result = accepts(c, options)
    expect(result).toBe('application/xml')
  })
})

describe('Usage', () => {
  test('decide compression by Accept-Encoding header', async () => {
    const app = new Hono()
    app.get('/compressed', async (c) => {
      const encoding = accepts(c, {
        header: 'Accept-Encoding',
        supports: ['gzip', 'deflate'],
        default: 'identity',
      })
      const COMPRESS_DATA = 'COMPRESS_DATA'
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(COMPRESS_DATA))
          controller.close()
        },
      })

      if (encoding === 'gzip') {
        c.header('Content-Encoding', 'gzip')
        return c.body(readable.pipeThrough(new CompressionStream('gzip')))
      }
      if (encoding === 'deflate') {
        c.header('Content-Encoding', 'deflate')
        return c.body(readable.pipeThrough(new CompressionStream('deflate')))
      }

      c.body(COMPRESS_DATA)
    })

    const req1 = await app.request('/compressed', { headers: { 'Accept-Encoding': 'deflate' } })
    const req2 = await app.request('/compressed', { headers: { 'Accept-Encoding': 'gzip' } })
    const req3 = await app.request('/compressed', {
      headers: { 'Accept-Encoding': 'gzip;q=0.5,deflate' },
    })
    const req4 = await app.request('/compressed', { headers: { 'Accept-Encoding': 'br' } })

    expect(req1.headers.get('Content-Encoding')).toBe('deflate')
    expect(req2.headers.get('Content-Encoding')).toBe('gzip')
    expect(req3.headers.get('Content-Encoding')).toBe('deflate')
    expect(req4.headers.get('Content-Encoding')).toBeNull()
  })

  test('decide language by Accept-Language header', async () => {
    const app = new Hono()
    const SUPPORTED_LANGS = ['en', 'ja', 'zh']
    app.get('/*', async (c) => {
      const lang = accepts(c, {
        header: 'Accept-Language',
        supports: SUPPORTED_LANGS,
        default: 'en',
      })
      const isLangedPath = SUPPORTED_LANGS.some((l) => c.req.path.startsWith(`/${l}`))
      if (isLangedPath) {
        return c.body(`lang: ${lang}`)
      }

      return c.redirect(`/${lang}${c.req.path}`)
    })

    const req1 = await app.request('/foo', { headers: { 'Accept-Language': 'en=0.8,ja' } })
    const req2 = await app.request('/en/foo', { headers: { 'Accept-Language': 'en' } })

    expect(req1.status).toBe(302)
    expect(req1.headers.get('Location')).toBe('/ja/foo')
    expect(await req2.text()).toBe('lang: en')
  })
})
