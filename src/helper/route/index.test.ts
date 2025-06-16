import { Context } from '../../context'
import { matchedRoutes, routePath, baseRoutePath, basePath } from '.'

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
