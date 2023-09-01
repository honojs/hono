/* eslint-disable quotes */
import { Hono } from '../../hono'
import { poweredBy } from '../powered-by'
import { secureHeaders } from '.'

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
})
