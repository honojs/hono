/* eslint-disable quotes */
import { Hono } from '../../hono'
import { poweredBy } from '../powered-by'
import { secureHeaders } from '.'

describe('Secure Headers Middleware', () => {
  it('all headers enabled', async () => {
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
    expect(res.headers.get('Cross-Origin-Embedder-Policy')).toEqual('require-corp')
    expect(res.headers.get('Content-Security-Policy')).toBeFalsy
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
      "defaultSrc 'self'; baseUri 'self'; fontSrc 'self' https: data:; frameAncestors 'self'; imgSrc 'self' data:; objectSrc 'none'; scriptSrc 'self'; scriptSrcAttr 'none'; styleSrc 'self' https: 'unsafe-inline'"
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
    expect(res.headers.get('Content-Security-Policy')).toEqual("defaultSrc 'self'")
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
})
