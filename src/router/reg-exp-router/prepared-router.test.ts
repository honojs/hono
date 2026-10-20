import type { ParamIndexMap } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import { runTest } from '../common.case.test'
import { buildInitParams, serializeInitParams, PreparedRegExpRouter } from './prepared-router'
import { RegExpRouter } from './router'

describe('PreparedRegExpRouter', async () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: [
          'Duplicate param name > parent',
          'Duplicate param name > child',
          'Capture Group > Complex capturing group > GET request',
          'Capture complex multiple directories > GET /part1/middle-b/latest',
          'Capture complex multiple directories > GET /part1/middle-b/end-c/latest',
          'Complex > Parameter with {.*} regexp',
        ],
      },
      {
        reason:
          'This route can not be added with `:label` to PreparedRegExpRouter. This is ambiguous',
        tests: ['Including slashes > GET /js/main.js'],
      },
    ],
    newRouter: <T>() => {
      let router: PreparedRegExpRouter<T>
      const routes: [string, string, T][] = []
      return {
        name: 'PreparedRegExpRouterBuilder',
        add: (method: string, path: string, handler: T) => {
          routes.push([method, path, handler])
        },
        match: (method: string, path: string) => {
          if (!router) {
            const serialized = serializeInitParams(
              buildInitParams({
                paths: routes.map((r) => r[1]),
              })
            )
            const params = eval(serialized) as ConstructorParameters<typeof PreparedRegExpRouter<T>>
            router = new PreparedRegExpRouter<T>(...params)

            for (const route of routes) {
              router.add(...route)
            }
          }
          return router.match(method, path)
        },
      }
    },
  })

  describe('add()', () => {
    it('should add a route', () => {
      const params = buildInitParams({
        paths: ['/hello'],
      })
      const router = new PreparedRegExpRouter(...params)
      router.add('GET', '/hello', 'get hello')
      expect(router.match('GET', '/hello')).toEqual([[['get hello', {}]], []])
    })

    it('should throw an error if the path is not pre-registered', () => {
      const params = buildInitParams({
        paths: ['/hello'],
      })
      const router = new PreparedRegExpRouter(...params)
      expect(() => router.add('GET', '/unknown', 'get hello')).toThrowError()
    })
  })
})

describe('buildInitParams() and serializeInitParams()', () => {
  it('should build empty init params', () => {
    const params = buildInitParams({
      paths: [],
    })
    expect(params).toEqual([{ [METHOD_NAME_ALL]: [/^$/, [], {}] }, {}])
    expect((0, eval)(serializeInitParams(params))).toEqual(params)
  })

  it('should build init params with one static path', () => {
    const params = buildInitParams({
      paths: ['/hello'],
    })
    expect(params).toEqual([
      {
        [METHOD_NAME_ALL]: [
          /^$/,
          [],
          {
            '/hello': [[], []],
          },
        ],
      },
      {
        '/hello': [[[''], {}]],
      },
    ])
    expect((0, eval)(serializeInitParams(params))).toEqual(params)
  })

  it('should preserve static middleware params when serialized', () => {
    const params = buildInitParams({
      paths: ['/:x{a}/*', '/:y{b}/*', '/a/foo', '/b/foo'],
    })
    const restored = (0, eval)(serializeInitParams(params)) as typeof params
    expect(restored).toEqual(params)

    const router = new PreparedRegExpRouter(...restored)
    router.add('ALL', '/:x{a}/*', 'middleware a')
    router.add('GET', '/a/foo', 'handler a')
    router.add('ALL', '/:y{b}/*', 'middleware b')
    router.add('POST', '/b/foo', 'handler b')

    const [aHandlers, aParams] = router.match('GET', '/a/foo')
    expect(aHandlers).toEqual([
      ['middleware a', { x: expect.any(Number) }],
      ['handler a', {}],
    ])
    expect(aParams?.[aHandlers[0][1].x as number]).toBe('a')

    const [bHandlers, bParams] = router.match('POST', '/b/foo')
    expect(bHandlers).toEqual([
      ['middleware b', { y: expect.any(Number) }],
      ['handler b', {}],
    ])
    expect(bParams?.[bHandlers[0][1].y as number]).toBe('b')
  })

  it('should relocate compact params separately for each static route', () => {
    const params = buildInitParams({
      paths: ['/a/:y{b}/*', '/:x{a}/*', '/a/foo', '/a/b/foo', '/:x{a}/*'],
    })
    const restored = (0, eval)(serializeInitParams(params)) as typeof params
    expect(restored).toEqual(params)

    for (const initParams of [params, restored]) {
      const router = new PreparedRegExpRouter(...initParams)
      router.add('ALL', '/a/:y{b}/*', 'inner')
      router.add('ALL', '/:x{a}/*', 'outer')
      router.add('ALL', '/:x{a}/*', 'outer again')
      router.add('GET', '/a/foo', 'get handler')
      router.add('POST', '/a/b/foo', 'post handler')

      const [outerHandlers, outerParams] = router.match('GET', '/a/foo')
      expect(outerParams).toHaveLength(1)
      expect(outerHandlers.map(([handler]) => handler)).toEqual([
        'outer',
        'outer again',
        'get handler',
      ])
      for (const [, map] of outerHandlers.slice(0, 2)) {
        expect(outerParams?.[(map as ParamIndexMap).x]).toBe('a')
      }

      const [innerHandlers, innerParams] = router.match('POST', '/a/b/foo')
      expect(innerParams).toHaveLength(2)
      expect(innerHandlers.map(([handler]) => handler)).toEqual([
        'inner',
        'outer',
        'outer again',
        'post handler',
      ])
      expect(innerParams?.[(innerHandlers[0][1] as ParamIndexMap).y]).toBe('b')
      for (const [, map] of innerHandlers.slice(1, 3)) {
        expect(innerParams?.[(map as ParamIndexMap).x]).toBe('a')
      }
    }
  })

  it.each([
    ['/a/*/:y?', ['/a/x/b', '/a/x']],
    ['/bar/:b?', ['/bar/1', '/bar']],
  ])('should relocate an optional param handler like RegExpRouter: %s', (path, requests) => {
    const params = buildInitParams({ paths: [path] })
    const restored = (0, eval)(serializeInitParams(params)) as typeof params
    const router = new PreparedRegExpRouter(...restored)
    const regExpRouter = new RegExpRouter<string>()
    router.add('GET', path, 'handler')
    regExpRouter.add('GET', path, 'handler')

    for (const request of requests) {
      expect(router.match('GET', request)).toEqual(regExpRouter.match('GET', request))
    }
  })

  it('should build init params with paths with params', () => {
    const params = buildInitParams({
      paths: ['/hello/:name', '/hello/:name/posts/:postId'],
    })
    expect(params).toEqual([
      {
        [METHOD_NAME_ALL]: [/^\/hello\/([^/]+)(?:$()|\/posts\/([^/]+)$())/, [0, 0, [], 0, []], {}],
      },
      {
        '/hello/:name': [[[2], { name: 1 }]],
        '/hello/:name/posts/:postId': [[[4], { name: 1, postId: 3 }]],
      },
    ])
    expect((0, eval)(serializeInitParams(params))).toEqual(params)
  })

  it('should build init params with wildcard', () => {
    const params = buildInitParams({
      paths: ['*'],
    })
    expect(params).toEqual([
      {
        [METHOD_NAME_ALL]: [/^.*$()/, [0, []], {}],
      },
      {},
    ])
    expect((0, eval)(serializeInitParams(params))).toEqual(params)
  })

  it('should build init params with complex path', () => {
    const params = buildInitParams({
      paths: ['/hello', '/hello/:name', '/hello/:name/posts/:postId', '*'],
    })
    expect(params).toEqual([
      {
        [METHOD_NAME_ALL]: [
          /^(?:\/hello\/([^/]+)(?:$()|\/posts\/([^/]+)$())|.*$())/,
          [0, 0, [], 0, [], []],
          {
            '/hello': [[], []],
          },
        ],
      },
      {
        '/hello': [[[''], {}]],
        '/hello/:name': [[[2], { name: 1 }]],
        '/hello/:name/posts/:postId': [[[4], { name: 1, postId: 3 }]],
      },
    ])
    expect((0, eval)(serializeInitParams(params))).toEqual(params)
  })
})
