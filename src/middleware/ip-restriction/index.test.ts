import { Hono } from '../../hono'
import { Context } from '../../context'
import { HonoRequest } from '../../request'
import type { GetConnInfo } from '../../helper/conninfo'
import { ipRestriction, isMatchForRule } from '.'

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
    )(new Context(new HonoRequest(new Request('http://localhost/'))), async () => void 0)
    expect(res).toBeTruthy()
    if (res) {
      expect(await res.text()).toBe('error')
    }
  })
})

describe('isMatchForRule', () => {
  it('CIDR Notation', () => {
    expect(isMatchForRule({ addr: '192.168.2.0', type: 'IPv4' }, '192.168.2.0/24')).toBeTruthy()
    expect(isMatchForRule({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.0/24')).toBeTruthy()

    expect(isMatchForRule({ addr: '::0', type: 'IPv6' }, '::0/1')).toBeTruthy()
  })
  it('Static Rules', () => {
    expect(isMatchForRule({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.1')).toBeTruthy()
    expect(isMatchForRule({ addr: '1234::5678', type: 'IPv6' }, '1234::5678')).toBeTruthy()
  })
  it('Function Rules', () => {
    expect(isMatchForRule({ addr: '0.0.0.0', type: 'IPv4' }, () => true)).toBeTruthy()
    expect(isMatchForRule({ addr: '0.0.0.0', type: 'IPv4' }, () => false)).toBeFalsy()

    const ipaddr = '93.184.216.34'
    isMatchForRule({ addr: ipaddr, type: 'IPv4' }, (ip) => {
      expect(ipaddr).toBe(ip.addr)
      return false
    })
  })
})