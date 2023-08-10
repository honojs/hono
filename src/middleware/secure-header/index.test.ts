import { Hono } from '../../hono'
import { secureHeader } from '.'

describe('Secure Header Middleware', () => {

  it('all headers enabled', async () => {
    const app = new Hono()
    app.use('*', secureHeader())
    app.get('/test', async (ctx) => {
      return ctx.text('test')
    })

    const req = new Request('http://localhost/test', { method: 'GET' })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Frame-Options')).toEqual('DENY')
    expect(res.headers.get('Strict-Transport-Security')).toEqual('max-age=15552000; includeSubDomains')
    expect(res.headers.get('X-Download-Options')).toEqual('noopen')
    expect(res.headers.get('X-XSS-Protection')).toEqual('0')
    expect(res.headers.get('X-Powered-By')).toBeNull()
    expect(res.headers.get('X-DNS-Prefetch-Control')).toEqual('off')
    expect(res.headers.get('X-Content-Type-Options')).toEqual('nosniff')  
  })

  it('specific headers disabled', async () => {
    const app = new Hono()
    app.use('*', secureHeader({ xFrameOptions: false, xXssProtection: false }))
    app.get('/test', async (ctx) => {
      return ctx.text('test')
    })

    const req = new Request('http://localhost/test', { method: 'GET' })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Frame-Options')).toBeNull()
    expect(res.headers.get('Strict-Transport-Security')).toEqual('max-age=15552000; includeSubDomains')
    expect(res.headers.get('X-Download-Options')).toEqual('noopen')
    expect(res.headers.get('X-XSS-Protection')).toBeNull()
    expect(res.headers.get('X-Powered-By')).toBeNull()
  })

})