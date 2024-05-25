import { Hono } from '../..'
import type { GetConnInfo } from '../../helper/conninfo'
import { ipLimit, isMatchForRule } from '.'

describe('ipLimit middleware', () => {
  it('Should limit', async () => {
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
      '*',
      ipLimit(getConnInfo, {
        allow: ['192.168.1.0', '192.168.2.0/24'],
        deny: ['192.168.2.10'],
      })
    )
    app.get('/', (c) => c.text('Hello World!'))

    expect((await app.request('/', {}, { ip: '0.0.0.0' })).status).toBe(403)

    expect((await app.request('/', {}, { ip: '192.168.1.0' })).status).toBe(200)

    expect((await app.request('/', {}, { ip: '192.168.2.5' })).status).toBe(200)
    expect((await app.request('/', {}, { ip: '192.168.2.10' })).status).toBe(403)
  })
})

describe('isMatchForRule', () => {
  it('IPv4 Wildcard', () => {
    expect(isMatchForRule({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.*')).toBeTruthy()
    expect(isMatchForRule({ addr: '192.168.3.1', type: 'IPv4' }, '192.168.2.*')).toBeFalsy()
  })
  it('CIDR Notation', () => {
    expect(isMatchForRule({ addr: '192.168.2.0', type: 'IPv4' }, '192.168.2.0/24')).toBeTruthy()
    expect(isMatchForRule({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.0/24')).toBeTruthy()

    expect(isMatchForRule({ addr: '::0', type: 'IPv6' }, '::0/1')).toBeTruthy()
  })
  it('Static Rules', () => {
    expect(isMatchForRule({ addr: '192.168.2.1', type: 'IPv4' }, '192.168.2.1')).toBeTruthy()
    expect(isMatchForRule({ addr: '1234::5678', type: 'IPv6' }, '1234::5678')).toBeTruthy()
  })
})
