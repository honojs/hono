import { Context } from '../../context'
import { matchedRoutes, routePath, baseRoutePath, basePath, handlerPath } from '.'

const defaultContextOptions = {
  executionCtx: {
    waitUntil: () => {},
    passThroughOnException: () => {},
    props: {},
  },
  env: {},
}

describe('matchedRoutes', () => {
  it('should return matched routes', () => {
    const handlerA = () => {}
    const handlerB = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const c = new Context(rawRequest, {
      path: '/123/key',
      matchResult: [
        [
          [
            [handlerA, { basePath: '/', handler: handlerA, method: 'GET', path: '/:id' }],
            { id: '123' },
          ],
          [
            [handlerA, { basePath: '/', handler: handlerB, method: 'GET', path: '/:id/:name' }],
            { id: '456', name: 'key' },
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(matchedRoutes(c)).toEqual([
      { basePath: '/', handler: handlerA, method: 'GET', path: '/:id' },
      { basePath: '/', handler: handlerB, method: 'GET', path: '/:id/:name' },
    ])
  })
})

describe('routePath', () => {
  it('should return route path', () => {
    const handlerA = () => {}
    const handlerB = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const c = new Context(rawRequest, {
      path: '/123/key',
      matchResult: [
        [
          [
            [handlerA, { basePath: '/', handler: handlerA, method: 'GET', path: '/:id' }],
            { id: '123' },
          ],
          [
            [handlerA, { basePath: '/', handler: handlerB, method: 'GET', path: '/:id/:name' }],
            { id: '456', name: 'key' },
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(routePath(c)).toBe('/:id')

    expect(routePath(c, 0)).toBe('/:id')
    expect(routePath(c, 1)).toBe('/:id/:name')
    expect(routePath(c, -1)).toBe('/:id/:name')
    expect(routePath(c, 2)).toBe('')

    c.req.routeIndex = 1
    expect(routePath(c)).toBe('/:id/:name')
  })
})

describe('baseRoutePath', () => {
  it('should return raw basePath', () => {
    const handlerA = () => {}
    const handlerB = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const c = new Context(rawRequest, {
      path: '/123/key',
      matchResult: [
        [
          [
            [handlerA, { basePath: '/', handler: handlerA, method: 'GET', path: '/:id' }],
            { id: '123' },
          ],
          [
            [handlerA, { basePath: '/sub', handler: handlerB, method: 'GET', path: '/:id/:name' }],
            { id: '456', name: 'key' },
          ],
          [
            [handlerA, { basePath: '/:sub', handler: handlerB, method: 'GET', path: '/:id/:name' }],
            { id: '456', name: 'key' },
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(baseRoutePath(c)).toBe('/')

    expect(baseRoutePath(c, 0)).toBe('/')
    expect(baseRoutePath(c, 1)).toBe('/sub')
    expect(baseRoutePath(c, 2)).toBe('/:sub')
    expect(baseRoutePath(c, -1)).toBe('/:sub')
    expect(baseRoutePath(c, 3)).toBe('')

    c.req.routeIndex = 1
    expect(baseRoutePath(c)).toBe('/sub')

    c.req.routeIndex = 2
    expect(baseRoutePath(c)).toBe('/:sub')
  })
})

describe('basePath', () => {
  it('should return basePath without parameters', () => {
    const handlerA = () => {}
    const handlerB = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const c = new Context(rawRequest, {
      path: '/123/key',
      matchResult: [
        [
          [
            [handlerA, { basePath: '/', handler: handlerA, method: 'GET', path: '/:id' }],
            { id: '123' },
          ],
          [
            [handlerA, { basePath: '/sub', handler: handlerB, method: 'GET', path: '/:id/:name' }],
            { id: '456', name: 'key' },
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(basePath(c)).toBe('/')
    expect(basePath(c)).toBe('/') // cached value

    expect(basePath(c, 0)).toBe('/')
    expect(basePath(c, 1)).toBe('/sub')
    expect(basePath(c, -1)).toBe('/sub')
    expect(basePath(c, 2)).toBe('')

    c.req.routeIndex = 1
    expect(basePath(c)).toBe('/sub')
  })

  it('should return basePath with embedded parameters', () => {
    const handlerA = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const c = new Context(rawRequest, {
      path: '/sub-app-path/123/key',
      matchResult: [
        [
          [
            [handlerA, { basePath: '/:sub', handler: handlerA, method: 'GET', path: '/:id' }],
            { id: '123' },
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(basePath(c)).toBe('/sub-app-path')
  })

  it('should return basePath with wildcard', () => {
    const handlerA = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const c = new Context(rawRequest, {
      path: '/sub-app-path/foo/app/123/key',
      matchResult: [
        [
          [
            [
              handlerA,
              { basePath: '/sub-app-path/*/app', handler: handlerA, method: 'GET', path: '/:id' },
            ],
            { id: '123' },
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(basePath(c)).toBe('/sub-app-path/foo/app')
  })

  it('should return basePath with custom regex pattern', () => {
    const handlerA = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const c = new Context(rawRequest, {
      path: '/sub-app-path/foo/123/key',
      matchResult: [
        [
          [
            [
              handlerA,
              {
                basePath: '/sub-app-path/:sub{foo|bar}',
                handler: handlerA,
                method: 'GET',
                path: '/:id',
              },
            ],
            { sub: 'foo', id: '123' },
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(basePath(c)).toBe('/sub-app-path/foo')
  })
})

describe('handlerPath', () => {
  it('should return the path of the actual handler, ignoring middleware', () => {
    const middlewareA = () => {}
    const handler = () => {}
    const middlewareB = () => {}
    const rawRequest = new Request('http://localhost/health', { method: 'GET' })
    const c = new Context(rawRequest, {
      path: '/health',
      matchResult: [
        [
          [
            [middlewareA, { basePath: '/', handler: middlewareA, method: 'ALL', path: '/*' }],
            {},
          ],
          [
            [handler, { basePath: '/', handler: handler, method: 'GET', path: '/health' }],
            {},
          ],
          [
            [middlewareB, { basePath: '/', handler: middlewareB, method: 'ALL', path: '/*' }],
            {},
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    // Should return the GET handler path, not the middleware path
    expect(handlerPath(c)).toBe('/health')
  })

  it('should return empty string when no handler matches', () => {
    const middlewareA = () => {}
    const rawRequest = new Request('http://localhost/health', { method: 'GET' })
    const c = new Context(rawRequest, {
      path: '/health',
      matchResult: [
        [
          [
            [middlewareA, { basePath: '/', handler: middlewareA, method: 'ALL', path: '/*' }],
            {},
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    expect(handlerPath(c)).toBe('')
  })

  it('should work correctly regardless of middleware registration order', () => {
    const middlewareA = () => {}
    const handler = () => {}
    const middlewareB = () => {}
    const rawRequest = new Request('http://localhost/users/123', { method: 'GET' })
    const c = new Context(rawRequest, {
      path: '/users/123',
      matchResult: [
        [
          [
            [middlewareA, { basePath: '/', handler: middlewareA, method: 'ALL', path: '/*' }],
            {},
          ],
          [
            [
              handler,
              { basePath: '/', handler: handler, method: 'GET', path: '/users/:id' },
            ],
            { id: '123' },
          ],
          [
            [middlewareB, { basePath: '/', handler: middlewareB, method: 'ALL', path: '/*' }],
            {},
          ],
        ],
      ],
      ...defaultContextOptions,
    })

    // routePath(c, -1) would return '/*' (from middlewareB), but handlerPath returns the real handler
    expect(handlerPath(c)).toBe('/users/:id')
  })
})
