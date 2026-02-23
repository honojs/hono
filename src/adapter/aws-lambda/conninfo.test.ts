import { Context } from '../../context'
import { getConnInfo } from './conninfo'

describe('getConnInfo', () => {
  describe('API Gateway v1', () => {
    it('Should return the client IP from identity.sourceIp', () => {
      const ip = '203.0.113.42'
      const c = new Context(new Request('http://localhost/'), {
        env: {
          requestContext: {
            identity: {
              sourceIp: ip,
              userAgent: 'test',
            },
            accountId: '123',
            apiId: 'abc',
            authorizer: {},
            domainName: 'example.com',
            domainPrefix: 'api',
            extendedRequestId: 'xxx',
            httpMethod: 'GET',
            path: '/',
            protocol: 'HTTP/1.1',
            requestId: 'req-1',
            requestTime: '',
            requestTimeEpoch: 0,
            resourcePath: '/',
            stage: 'prod',
          },
        },
      })

      const info = getConnInfo(c)

      expect(info.remote.address).toBe(ip)
    })
  })

  describe('API Gateway v2', () => {
    it('Should return the client IP from http.sourceIp', () => {
      const ip = '198.51.100.23'
      const c = new Context(new Request('http://localhost/'), {
        env: {
          requestContext: {
            http: {
              method: 'GET',
              path: '/',
              protocol: 'HTTP/1.1',
              sourceIp: ip,
              userAgent: 'test',
            },
            accountId: '123',
            apiId: 'abc',
            authentication: null,
            authorizer: {},
            domainName: 'example.com',
            domainPrefix: 'api',
            requestId: 'req-1',
            routeKey: 'GET /',
            stage: 'prod',
            time: '',
            timeEpoch: 0,
          },
        },
      })

      const info = getConnInfo(c)

      expect(info.remote.address).toBe(ip)
    })
  })

  describe('ALB', () => {
    it.each([
      {
        description: 'ALB appends real client IP',
        xff: '10.0.0.1, 192.0.2.50',
        expected: '192.0.2.50',
      },
      {
        description: 'attacker-controlled first IP',
        xff: '127.0.0.1, 192.168.1.100',
        expected: '192.168.1.100',
      },
    ])('Should return the last IP from x-forwarded-for ($description)', ({ xff, expected }) => {
      const req = new Request('http://localhost/', {
        headers: { 'x-forwarded-for': xff },
      })
      const c = new Context(req, {
        env: {
          requestContext: {
            elb: {
              targetGroupArn: 'arn:aws:elasticloadbalancing:...',
            },
          },
        },
      })
      const info = getConnInfo(c)
      expect(info.remote.address).toBe(expected)
    })

    it('Should return undefined when no x-forwarded-for header', () => {
      const c = new Context(new Request('http://localhost/'), {
        env: {
          requestContext: {
            elb: {
              targetGroupArn: 'arn:aws:elasticloadbalancing:...',
            },
          },
        },
      })

      const info = getConnInfo(c)

      expect(info.remote.address).toBeUndefined()
    })
  })
})
