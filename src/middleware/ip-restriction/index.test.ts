import { Context } from '../../context'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import { Hono } from '../../hono'
import { ipRestriction } from '.'
import type { IPRestrictionRule } from '.'

describe('ipRestriction middleware', () => {
  it('Should restrict', async () => {
    const getConnInfo: GetConnInfo = (c) => {
      return {
        remote: {
          address: c.env.ip,
        },
      }
    }
    const app = new Hono<{
      Bindings: {
        ip: string
      }
    }>()
    app.use(
      '/basic',
      ipRestriction(getConnInfo, {
        allowList: ['192.168.1.0', '192.168.2.0/24'],
        denyList: ['192.168.2.10'],
      })
    )
    app.get('/basic', (c) => c.text('Hello World!'))

    app.use(
      '/allow-empty',
      ipRestriction(getConnInfo, {
        denyList: ['192.168.1.0'],
      })
    )
    app.get('/allow-empty', (c) => c.text('Hello World!'))

    expect((await app.request('/basic', {}, { ip: '0.0.0.0' })).status).toBe(403)

    expect((await app.request('/basic', {}, { ip: '192.168.1.0' })).status).toBe(200)

    expect((await app.request('/basic', {}, { ip: '192.168.2.5' })).status).toBe(200)
    expect((await app.request('/basic', {}, { ip: '192.168.2.10' })).status).toBe(403)

    expect((await app.request('/allow-empty', {}, { ip: '0.0.0.0' })).status).toBe(200)

    expect((await app.request('/allow-empty', {}, { ip: '192.168.1.0' })).status).toBe(403)

    expect((await app.request('/allow-empty', {}, { ip: '192.168.2.5' })).status).toBe(200)
    expect((await app.request('/allow-empty', {}, { ip: '192.168.2.10' })).status).toBe(200)
  })
  it('Custom onerror', async () => {
    const res = await ipRestriction(
      () => '0.0.0.0',
      { denyList: ['0.0.0.0'] },
      () => new Response('error')
    )(new Context(new Request('http://localhost/')), async () => void 0)
    expect(res).toBeTruthy()
    if (res) {
      expect(await res.text()).toBe('error')
    }
  })

  test.each(['999.999.999.999', '2001:db8::1%eth0', '1234:::5678'])(
    'Should reject invalid remote address: %s',
    async (ip) => {
      const app = new Hono<{
        Bindings: {
          ip: string
        }
      }>()
      app.use(
        '/invalid',
        ipRestriction(
          (c) => ({
            remote: {
              address: c.env.ip,
            },
          }),
          {
            allowList: ['127.0.0.1'],
          }
        )
      )
      app.get('/invalid', (c) => c.text('Hello World!'))

      expect((await app.request('/invalid', {}, { ip })).status).toBe(403)
    }
  )

  it('Should not call onError for invalid remote addresses', async () => {
    const app = new Hono<{
      Bindings: {
        ip: string
      }
    }>()
    app.use(
      '/invalid',
      ipRestriction(
        (c) => ({
          remote: {
            address: c.env.ip,
          },
        }),
        {
          allowList: ['127.0.0.1'],
        },
        () => new Response('custom error', { status: 418 })
      )
    )
    app.get('/invalid', (c) => c.text('Hello World!'))

    const res = await app.request('/invalid', {}, { ip: '1234:::5678' })
    expect(res.status).toBe(403)
    expect(await res.text()).toBe('Forbidden')
  })
})

describe('isMatchForRule', () => {
  const isMatch = async (info: { addr: string; type: AddressType }, rule: IPRestrictionRule) => {
    const middleware = ipRestriction(
      () => ({
        remote: {
          address: info.addr,
          addressType: info.type,
        },
      }),
      {
        allowList: [rule],
      }
    )
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await middleware(undefined as any, () => Promise.resolve())
    } catch {
      return false
    }
    return true
  }

  test.each(['192.168.0.0/33', '::/129', '127.0.0.1/', '::ffff:127.0.0.1/129'])(
    'Should throw for invalid CIDR rule: %s',
    (rule) => {
      expect(() =>
        ipRestriction(() => '127.0.0.1', {
          allowList: [rule],
        })
      ).toThrow(`Invalid rule: ${rule}`)
    }
  )

  it('star', async () => {
    expect(await isMatch({ addr: '192.168.2.0', type: 'IPv4' }, '*')).toBeTruthy()
    expect(await isMatch({ addr: '192.168.2.1', type: 'IPv4' }, '*')).toBeTruthy()
    expect(await isMatch({ addr: '::0', type: 'IPv6' }, '*')).toBeTruthy()
  })
  it('CIDR Notation', async () => {
    expect(await isMatch({ addr: '192.168.2.0', type: 'IPv4' }, '192.168.2.0/24')).toBeTruthy()
    expect(await isMatch({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.0/24')).toBeTruthy()
    expect(await isMatch({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.1/32')).toBeTruthy()
    expect(await isMatch({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.2/32')).toBeFalsy()

    expect(await isMatch({ addr: '::0', type: 'IPv6' }, '::0/1')).toBeTruthy()
    expect(await isMatch({ addr: '::1', type: 'IPv6' }, '0.0.0.0/24')).toBeFalsy()
    expect(await isMatch({ addr: '::abcd:1', type: 'IPv6' }, '127.0.0.0/8')).toBeFalsy()
    expect(await isMatch({ addr: '::1', type: 'IPv6' }, '::ffff:1.0.0.0/96')).toBeFalsy()

    expect(
      await isMatch({ addr: '::ffff:192.168.1.1', type: 'IPv6' }, '::ffff:192.168.1.0/120')
    ).toBeTruthy()
    expect(
      await isMatch({ addr: '192.168.1.1', type: 'IPv4' }, '::ffff:192.168.1.0/120')
    ).toBeTruthy()
    expect(
      await isMatch({ addr: '::ffff:192.168.1.1', type: 'IPv6' }, '192.168.1.0/24')
    ).toBeTruthy()
    expect(await isMatch({ addr: '::ffff:10.0.0.1', type: 'IPv6' }, '192.168.1.0/24')).toBeFalsy()
    expect(await isMatch({ addr: '::ffff:192.168.1.1', type: 'IPv6' }, '::/0')).toBeTruthy()
    expect(
      await isMatch({ addr: '::ffff:192.168.1.1', type: 'IPv6' }, '::ffff:0:0/95')
    ).toBeTruthy()
  })
  it('Static Rules', async () => {
    expect(await isMatch({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.1')).toBeTruthy()
    expect(await isMatch({ addr: '1234::5678', type: 'IPv6' }, '1234::5678')).toBeTruthy()
    expect(
      await isMatch({ addr: '::ffff:127.0.0.1', type: 'IPv6' }, '::ffff:127.0.0.1')
    ).toBeTruthy()
    expect(await isMatch({ addr: '::ffff:127.0.0.1', type: 'IPv6' }, '::ffff:7f00:1')).toBeTruthy()
    expect(await isMatch({ addr: '127.0.0.1', type: 'IPv4' }, '::ffff:127.0.0.1')).toBeTruthy()
    // IPv4-mapped IPv6 addresses are canonicalized to IPv4
    expect(await isMatch({ addr: '::ffff:127.0.0.1', type: 'IPv6' }, '127.0.0.1')).toBeTruthy()
    expect(await isMatch({ addr: '::ffff:127.0.0.1', type: 'IPv6' }, '127.0.0.2')).toBeFalsy()
    expect(await isMatch({ addr: '::ffff:7f00:1', type: 'IPv6' }, '127.0.0.1')).toBeTruthy()
    expect(await isMatch({ addr: '0:0:0:0:0:ffff:7f00:1', type: 'IPv6' }, '127.0.0.1')).toBeTruthy()
    // regular IPv6 is matched numerically without being treated as IPv4
    expect(await isMatch({ addr: '::1', type: 'IPv6' }, '::1')).toBeTruthy()
    expect(
      await isMatch({ addr: '2001:db8:0:0:0:0:0:1', type: 'IPv6' }, '2001:db8::1')
    ).toBeTruthy()
    expect(
      await isMatch({ addr: '2001:db8::1', type: 'IPv6' }, '2001:db8:0:0:0:0:0:1')
    ).toBeTruthy()
    expect(await isMatch({ addr: '::ffff:127.0.0.2', type: 'IPv6' }, '127.0.0.1')).toBeFalsy()
    expect(await isMatch({ addr: '::7f00:1', type: 'IPv6' }, '127.0.0.1')).toBeFalsy()
  })
  it('Function Rules', async () => {
    expect(await isMatch({ addr: '0.0.0.0', type: 'IPv4' }, () => true)).toBeTruthy()
    expect(await isMatch({ addr: '0.0.0.0', type: 'IPv4' }, () => false)).toBeFalsy()

    const ipaddr = '93.184.216.34'
    await isMatch({ addr: ipaddr, type: 'IPv4' }, (ip) => {
      expect(ipaddr).toBe(ip.addr)
      return false
    })
  })
})
