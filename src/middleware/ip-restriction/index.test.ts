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
  })
  it('Static Rules', async () => {
    expect(await isMatch({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.1')).toBeTruthy()
    expect(await isMatch({ addr: '1234::5678', type: 'IPv6' }, '1234::5678')).toBeTruthy()
    expect(
      await isMatch({ addr: '::ffff:127.0.0.1', type: 'IPv6' }, '::ffff:127.0.0.1')
    ).toBeTruthy()
    expect(await isMatch({ addr: '::ffff:127.0.0.1', type: 'IPv6' }, '::ffff:7f00:1')).toBeTruthy()
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
