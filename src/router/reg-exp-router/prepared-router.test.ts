import { METHOD_NAME_ALL } from '../../router'
import { runTest } from '../common.case.test'
import { buildInitParams, serializeInitParams, PreparedRegExpRouter } from './prepared-router'

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
        '/hello': [[['']]],
      },
    ])
    expect((0, eval)(serializeInitParams(params))).toEqual(params)
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
        '/hello': [[['']]],
        '/hello/:name': [[[2], { name: 1 }]],
        '/hello/:name/posts/:postId': [[[4], { name: 1, postId: 3 }]],
      },
    ])
    expect((0, eval)(serializeInitParams(params))).toEqual(params)
  })
})
