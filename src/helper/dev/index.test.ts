import { Hono } from '../../hono'
import type { Handler, MiddlewareHandler } from '../../types'
import { inspectRoutes, showRoutes } from '.'

const namedMiddleware: MiddlewareHandler = (_, next) => next()
const namedHandler: Handler = (c) => c.text('hi')
const app = new Hono()
  .use('*', (c, next) => next())
  .get(
    '/',
    (_, next) => next(),
    (c) => c.text('hi')
  )
  .get('/named', namedMiddleware, namedHandler)
  .post('/', (c) => c.text('hi'))
  .put('/', (c) => c.text('hi'))
  .patch('/', (c) => c.text('hi'))
  .delete('/', (c) => c.text('hi'))
  .options('/', (c) => c.text('hi'))
  .get('/static', () => new Response('hi'))

describe('inspectRoutes()', () => {
  it('should return correct data', async () => {
    expect(inspectRoutes(app)).toEqual([
      { path: '/*', method: 'ALL', name: '[middleware]', isMiddleware: true },
      { path: '/', method: 'GET', name: '[middleware]', isMiddleware: true },
      { path: '/', method: 'GET', name: '[handler]', isMiddleware: false },
      { path: '/named', method: 'GET', name: 'namedMiddleware', isMiddleware: true },
      { path: '/named', method: 'GET', name: 'namedHandler', isMiddleware: false },
      { path: '/', method: 'POST', name: '[handler]', isMiddleware: false },
      { path: '/', method: 'PUT', name: '[handler]', isMiddleware: false },
      { path: '/', method: 'PATCH', name: '[handler]', isMiddleware: false },
      { path: '/', method: 'DELETE', name: '[handler]', isMiddleware: false },
      { path: '/', method: 'OPTIONS', name: '[handler]', isMiddleware: false },
      { path: '/static', method: 'GET', name: '[handler]', isMiddleware: false },
    ])
  })
})

describe('showRoutes()', () => {
  let logs: string[] = []

  let originalLog: typeof console.log
  beforeAll(() => {
    originalLog = console.log
    console.log = (...args) => logs.push(...args)
  })
  afterAll(() => {
    console.log = originalLog
  })

  beforeEach(() => {
    logs = []
  })
  it('should render simple output', async () => {
    showRoutes(app)
    expect(logs).toEqual([
      '\x1b[32mGET\x1b[0m      /',
      '\x1b[32mGET\x1b[0m      /named',
      '\x1b[32mPOST\x1b[0m     /',
      '\x1b[32mPUT\x1b[0m      /',
      '\x1b[32mPATCH\x1b[0m    /',
      '\x1b[32mDELETE\x1b[0m   /',
      '\x1b[32mOPTIONS\x1b[0m  /',
      '\x1b[32mGET\x1b[0m      /static',
    ])
  })

  it('should render output includes handlers and middlewares', async () => {
    showRoutes(app, { verbose: true })
    expect(logs).toEqual([
      '\x1b[32mALL\x1b[0m      /*',
      '           [middleware]',
      '\x1b[32mGET\x1b[0m      /',
      '           [middleware]',
      '           [handler]',
      '\x1b[32mGET\x1b[0m      /named',
      '           namedMiddleware',
      '           namedHandler',
      '\x1b[32mPOST\x1b[0m     /',
      '           [handler]',
      '\x1b[32mPUT\x1b[0m      /',
      '           [handler]',
      '\x1b[32mPATCH\x1b[0m    /',
      '           [handler]',
      '\x1b[32mDELETE\x1b[0m   /',
      '           [handler]',
      '\x1b[32mOPTIONS\x1b[0m  /',
      '           [handler]',
      '\x1b[32mGET\x1b[0m      /static',
      '           [handler]',
    ])
  })
})
