/* eslint-disable quotes */
import { Hono } from '../../hono'
import { poweredBy } from '../powered-by'
import { NONCE, secureHeaders } from '.'
import type { ContentSecurityPolicyOptionHandler } from '.'

declare module '../..' {
  interface ContextVariableMap {
    ['test-scriptSrc-nonce']?: string
    ['test-styleSrc-nonce']?: string
  }
}

describe('Secure Headers Middleware', () => {
  it('default middleware', async () => {
    const app = new Hono()
    app.use('*', secureHeaders())
    app.get('/test', async (ctx) => {
      return ctx.text('test')
    })

    const res = await app.request('/test')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Frame-Options')).toEqual('SAMEORIGIN')
    expect(res.headers.get('Strict-Transport-Security')).toEqual(
      'max-age=15552000; includeSubDomains'
    )
    expect(res.headers.get('X-Download-Options')).toEqual('noopen')
    expect(res.headers.get('X-XSS-Protection')).toEqual('0')
    expect(res.headers.get('X-Powered-By')).toBeNull()
    expect(res.headers.get('X-DNS-Prefetch-Control')).toEqual('off')
    expect(res.headers.get('X-Content-Type-Options')).toEqual('nosniff')
    expect(res.headers.get('Referrer-Policy')).toEqual('no-referrer')
    expect(res.headers.get('X-Permitted-Cross-Domain-Policies')).toEqual('none')
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toEqual('same-origin')
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toEqual('same-origin')
    expect(res.headers.get('Origin-Agent-Cluster')).toEqual('?1')
    expect(res.headers.get('Permissions-Policy')).toBeNull()
    expect(res.headers.get('Content-Security-Policy')).toBeFalsy()
  })

  it('all headers enabled', async () => {
    const app = new Hono()
    app.use(
      '*',
      secureHeaders({
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
        },
        crossOriginEmbedderPolicy: true,
        permissionsPolicy: {
          camera: [],
        },
      })
    )
    app.get('/test', async (ctx) => {
      return ctx.text('test')
    })

    const res = await app.request('/test')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Frame-Options')).toEqual('SAMEORIGIN')
    expect(res.headers.get('Strict-Transport-Security')).toEqual(
      'max-age=15552000; includeSubDomains'
    )
    expect(res.headers.get('X-Download-Options')).toEqual('noopen')
    expect(res.headers.get('X-XSS-Protection')).toEqual('0')
    expect(res.headers.get('X-Powered-By')).toBeNull()
    expect(res.headers.get('X-DNS-Prefetch-Control')).toEqual('off')
    expect(res.headers.get('X-Content-Type-Options')).toEqual('nosniff')
    expect(res.headers.get('Referrer-Policy')).toEqual('no-referrer')
    expect(res.headers.get('X-Permitted-Cross-Domain-Policies')).toEqual('none')
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toEqual('same-origin')
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toEqual('same-origin')
    expect(res.headers.get('Origin-Agent-Cluster')).toEqual('?1')
    expect(res.headers.get('Cross-Origin-Embedder-Policy')).toEqual('require-corp')
    expect(res.headers.get('Permissions-Policy')).toEqual('camera=()')
    expect(res.headers.get('Content-Security-Policy')).toEqual("default-src 'self'")
  })

  it('specific headers disabled', async () => {
    const app = new Hono()
    app.use('*', secureHeaders({ xFrameOptions: false, xXssProtection: false }))
    app.get('/test', async (ctx) => {
      return ctx.text('test')
    })

    const res = await app.request('/test')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Frame-Options')).toBeNull()
    expect(res.headers.get('Strict-Transport-Security')).toEqual(
      'max-age=15552000; includeSubDomains'
    )
    expect(res.headers.get('X-Download-Options')).toEqual('noopen')
    expect(res.headers.get('X-XSS-Protection')).toBeNull()
    expect(res.headers.get('X-Powered-By')).toBeNull()
    expect(res.headers.get('X-DNS-Prefetch-Control')).toEqual('off')
    expect(res.headers.get('X-Content-Type-Options')).toEqual('nosniff')
    expect(res.headers.get('Referrer-Policy')).toEqual('no-referrer')
    expect(res.headers.get('X-Permitted-Cross-Domain-Policies')).toEqual('none')
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toEqual('same-origin')
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toEqual('same-origin')
    expect(res.headers.get('Permissions-Policy')).toBeNull()
    expect(res.headers.get('Origin-Agent-Cluster')).toEqual('?1')
  })

  it('should remove x-powered-by header', async () => {
    const appBefore = new Hono()
    appBefore.use('*', secureHeaders())
    appBefore.use('*', poweredBy())

    const resBefore = await appBefore.request('/')
    expect(resBefore.headers.get('x-powered-by')).toBeFalsy()

    const appAfter = new Hono()
    appAfter.use('*', poweredBy())
    appAfter.use('*', secureHeaders())

    const resAfter = await appAfter.request('/')
    expect(resAfter.headers.get('x-powered-by')).toBe('Hono')
  })

  it('should override Strict-Transport-Security header after middleware', async () => {
    const app = new Hono()
    app.use('/test1', secureHeaders())

    app.all('*', async (c) => {
      c.res.headers.set('Strict-Transport-Security', 'Hono')
      return c.text('header updated')
    })

    const res1 = await app.request('/test1')
    expect(res1.headers.get('Strict-Transport-Security')).toEqual(
      'max-age=15552000; includeSubDomains'
    )

    const res2 = await app.request('/test2')
    expect(res2.headers.get('Strict-Transport-Security')).toEqual('Hono')
  })

  it('should use custom value when overridden', async () => {
    const app = new Hono()
    app.use(
      '/test',
      secureHeaders({
        strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload;',
        xFrameOptions: 'DENY',
        xXssProtection: '1',
      })
    )

    const res = await app.request('/test')
    expect(res.headers.get('Strict-Transport-Security')).toEqual(
      'max-age=31536000; includeSubDomains; preload;'
    )
    expect(res.headers.get('X-FRAME-OPTIONS')).toEqual('DENY')
    expect(res.headers.get('X-XSS-Protection')).toEqual('1')
  })

  it('should set Permission-Policy header', async () => {
    const app = new Hono()
    app.use(
      '/test',
      secureHeaders({
        permissionsPolicy: {
          fullscreen: ['self'],
          bluetooth: ['none'],
          payment: ['self', 'example.com'],
          syncXhr: [],
          camera: false,
          microphone: true,
          geolocation: ['*'],
        },
      })
    )

    const res = await app.request('/test')
    expect(res.headers.get('Permissions-Policy')).toEqual(
      'fullscreen=(self), bluetooth=(none), payment=(self example.com), sync-xhr=(), camera=none, microphone=(), geolocation=(*)'
    )
  })
  it('CSP Setting', async () => {
    const app = new Hono()
    app.use(
      '/test',
      secureHeaders({
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        },
      })
    )

    app.all('*', async (c) => {
      c.res.headers.set('Strict-Transport-Security', 'Hono')
      return c.text('header updated')
    })

    const res = await app.request('/test')
    expect(res.headers.get('Content-Security-Policy')).toEqual(
      "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'"
    )
  })

  it('CSP Setting one only', async () => {
    const app = new Hono()
    app.use(
      '/test',
      secureHeaders({
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
        },
      })
    )

    app.all('*', async (c) => {
      return c.text('header updated')
    })

    const res = await app.request('/test')
    expect(res.headers.get('Content-Security-Policy')).toEqual("default-src 'self'")
  })

  it('No CSP Setting', async () => {
    const app = new Hono()
    app.use('/test', secureHeaders({ contentSecurityPolicy: {} }))

    app.all('*', async (c) => {
      return c.text('header updated')
    })

    const res = await app.request('/test')
    expect(res.headers.get('Content-Security-Policy')).toEqual('')
  })

  it('CSP with reportTo', async () => {
    const app = new Hono()
    app.use(
      '/test1',
      secureHeaders({
        reportingEndpoints: [
          {
            name: 'endpoint-1',
            url: 'https://example.com/reports',
          },
        ],
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          reportTo: 'endpoint-1',
        },
      })
    )

    app.use(
      '/test2',
      secureHeaders({
        reportTo: [
          {
            group: 'endpoint-1',
            max_age: 10886400,
            endpoints: [{ url: 'https://example.com/reports' }],
          },
        ],
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          reportTo: 'endpoint-1',
        },
      })
    )

    app.use(
      '/test3',
      secureHeaders({
        reportTo: [
          {
            group: 'g1',
            max_age: 10886400,
            endpoints: [
              { url: 'https://a.example.com/reports' },
              { url: 'https://b.example.com/reports' },
            ],
          },
          {
            group: 'g2',
            max_age: 10886400,
            endpoints: [
              { url: 'https://c.example.com/reports' },
              { url: 'https://d.example.com/reports' },
            ],
          },
        ],
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          reportTo: 'g2',
        },
      })
    )

    app.use(
      '/test4',
      secureHeaders({
        reportingEndpoints: [
          {
            name: 'e1',
            url: 'https://a.example.com/reports',
          },
          {
            name: 'e2',
            url: 'https://b.example.com/reports',
          },
        ],
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          reportTo: 'e1',
        },
      })
    )

    app.all('*', async (c) => {
      return c.text('header updated')
    })

    const res1 = await app.request('/test1')
    expect(res1.headers.get('Reporting-Endpoints')).toEqual(
      'endpoint-1="https://example.com/reports"'
    )
    expect(res1.headers.get('Content-Security-Policy')).toEqual(
      "default-src 'self'; report-to endpoint-1"
    )

    const res2 = await app.request('/test2')
    expect(res2.headers.get('Report-To')).toEqual(
      '{"group":"endpoint-1","max_age":10886400,"endpoints":[{"url":"https://example.com/reports"}]}'
    )
    expect(res2.headers.get('Content-Security-Policy')).toEqual(
      "default-src 'self'; report-to endpoint-1"
    )

    const res3 = await app.request('/test3')
    expect(res3.headers.get('Report-To')).toEqual(
      '{"group":"g1","max_age":10886400,"endpoints":[{"url":"https://a.example.com/reports"},{"url":"https://b.example.com/reports"}]}, {"group":"g2","max_age":10886400,"endpoints":[{"url":"https://c.example.com/reports"},{"url":"https://d.example.com/reports"}]}'
    )
    expect(res3.headers.get('Content-Security-Policy')).toEqual("default-src 'self'; report-to g2")

    const res4 = await app.request('/test4')
    expect(res4.headers.get('Reporting-Endpoints')).toEqual(
      'e1="https://a.example.com/reports", e2="https://b.example.com/reports"'
    )
    expect(res4.headers.get('Content-Security-Policy')).toEqual("default-src 'self'; report-to e1")
  })

  it('CSP nonce for script-src', async () => {
    const app = new Hono()
    app.use(
      '/test',
      secureHeaders({
        contentSecurityPolicy: {
          scriptSrc: ["'self'", NONCE],
        },
      })
    )

    app.all('*', async (c) => {
      return c.text(`nonce: ${c.get('secureHeadersNonce')}`)
    })

    const res = await app.request('/test')
    const csp = res.headers.get('Content-Security-Policy')
    const nonce = csp?.match(/script-src 'self' 'nonce-([a-zA-Z0-9+/]+=*)'/)?.[1] || ''
    expect(csp).toMatch(`script-src 'self' 'nonce-${nonce}'`)
    expect(await res.text()).toEqual(`nonce: ${nonce}`)
  })

  it('CSP nonce for script-src and style-src', async () => {
    const app = new Hono()
    app.use(
      '/test',
      secureHeaders({
        contentSecurityPolicy: {
          scriptSrc: ["'self'", NONCE],
          styleSrc: ["'self'", NONCE],
        },
      })
    )

    app.all('*', async (c) => {
      return c.text(`nonce: ${c.get('secureHeadersNonce')}`)
    })

    const res = await app.request('/test')
    const csp = res.headers.get('Content-Security-Policy')
    const nonce = csp?.match(/script-src 'self' 'nonce-([a-zA-Z0-9+/]+=*)'/)?.[1] || ''
    expect(csp).toMatch(`script-src 'self' 'nonce-${nonce}'`)
    expect(csp).toMatch(`style-src 'self' 'nonce-${nonce}'`)
    expect(await res.text()).toEqual(`nonce: ${nonce}`)
  })

  it('CSP nonce by app own function', async () => {
    const app = new Hono()
    const setNonce: ContentSecurityPolicyOptionHandler = (ctx, directive) => {
      ctx.set(`test-${directive}-nonce`, directive)
      return `'nonce-${directive}'`
    }
    app.use(
      '/test',
      secureHeaders({
        contentSecurityPolicy: {
          scriptSrc: ["'self'", setNonce],
          styleSrc: ["'self'", setNonce],
        },
      })
    )

    app.all('*', async (c) => {
      return c.text(
        `script: ${c.get('test-scriptSrc-nonce')}, style: ${c.get('test-styleSrc-nonce')}`
      )
    })

    const res = await app.request('/test')
    const csp = res.headers.get('Content-Security-Policy')
    expect(csp).toMatch(`script-src 'self' 'nonce-scriptSrc'`)
    expect(csp).toMatch(`style-src 'self' 'nonce-styleSrc'`)
    expect(await res.text()).toEqual('script: scriptSrc, style: styleSrc')
  })

  it('Remove X-Powered-By', async () => {
    const app = new Hono()

    app.get('/test', secureHeaders(), poweredBy(), async (c) => {
      return c.text('Hono is cool')
    })

    app.get(
      '/test2',
      secureHeaders({
        removePoweredBy: false,
      }),
      poweredBy(),
      async (c) => {
        return c.text('Hono is cool')
      }
    )

    const res = await app.request('/test')
    const poweredby = res.headers.get('X-Powered-By')
    expect(poweredby).toEqual(null)
    expect(await res.text()).toEqual('Hono is cool')

    const res2 = await app.request('/test2')
    const poweredby2 = res2.headers.get('X-Powered-By')
    expect(poweredby2).toEqual('Hono')
    expect(await res2.text()).toEqual('Hono is cool')
  })
})
