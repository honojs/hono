import { Hono } from '../../hono'
import { NONCE, secureHeaders } from '.'

describe('Secure Headers Middleware with combined CSP modes', () => {
  it('keeps the enforced policy when report-only uses a nonce', async () => {
    const app = new Hono()
    app.use(
      '*',
      secureHeaders({
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
        },
        contentSecurityPolicyReportOnly: {
          scriptSrc: ["'self'", NONCE],
        },
      })
    )
    app.get('/', (c) => c.text('test'))

    const res = await app.request('/')

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toMatch(
      /^script-src 'self' 'nonce-[a-zA-Z0-9+/]+=*'$/
    )
  })

  it('supports nonces in both policies', async () => {
    const app = new Hono()
    app.use(
      '*',
      secureHeaders({
        contentSecurityPolicy: {
          scriptSrc: ["'self'", NONCE],
        },
        contentSecurityPolicyReportOnly: {
          styleSrc: ["'self'", NONCE],
        },
      })
    )
    app.get('/', (c) => c.text('test'))

    const res = await app.request('/')
    const csp = res.headers.get('Content-Security-Policy')
    const reportOnly = res.headers.get('Content-Security-Policy-Report-Only')
    const nonce = csp?.match(/'nonce-([^']+)'/)?.[1]

    expect(res.status).toBe(200)
    expect(nonce).toBeTruthy()
    expect(reportOnly).toContain(`'nonce-${nonce}'`)
  })
})
