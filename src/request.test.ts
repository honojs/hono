import { HonoRequest } from './request'
import type { RouterRoute } from './types'

type RecursiveRecord<K extends string, T> = {
  [key in K]: T | RecursiveRecord<K, T>
}

describe('Query', () => {
  test('req.query() and req.queries()', () => {
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const req = new HonoRequest(rawRequest)

    const page = req.query('page')
    expect(page).not.toBeUndefined()
    expect(page).toBe('2')

    const q = req.query('q')
    expect(q).toBeUndefined()

    const tags = req.queries('tag')
    expect(tags).not.toBeUndefined()
    expect(tags).toEqual(['A', 'B'])

    const q2 = req.queries('q2')
    expect(q2).toBeUndefined()
  })

  test('decode special chars', () => {
    const rawRequest = new Request('http://localhost?mail=framework%40hono.dev&tag=%401&tag=%402')
    const req = new HonoRequest(rawRequest)

    const mail = req.query('mail')
    expect(mail).toBe('framework@hono.dev')

    const tags = req.queries('tag')
    expect(tags).toEqual(['@1', '@2'])
  })
})

describe('Param', () => {
  test('req.param() with ParamStash', () => {
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const req = new HonoRequest<'/:id/:name'>(rawRequest, '/123/key', [
      [
        [[undefined, {} as RouterRoute], { id: 0 }],
        [[undefined, {} as RouterRoute], { id: 0, name: 1 }],
      ],
      ['123', 'key'],
    ])

    expect(req.param('id')).toBe('123')
    expect(req.param('name')).toBe(undefined)

    req.routeIndex = 1
    expect(req.param('id')).toBe('123')
    expect(req.param('name')).toBe('key')
  })

  test('req.param() without ParamStash', () => {
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const req = new HonoRequest<'/:id/:name'>(rawRequest, '/123/key', [
      [
        [[undefined, {} as RouterRoute], { id: '123' }],
        [[undefined, {} as RouterRoute], { id: '456', name: 'key' }],
      ],
    ])

    expect(req.param('id')).toBe('123')
    expect(req.param('name')).toBe(undefined)

    req.routeIndex = 1
    expect(req.param('id')).toBe('456')
    expect(req.param('name')).toBe('key')
  })
})

describe('matchedRoutes', () => {
  test('req.routePath', () => {
    const handlerA = () => {}
    const handlerB = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const req = new HonoRequest<'/:id/:name'>(rawRequest, '/123/key', [
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
    ])

    expect(req.matchedRoutes).toEqual([
      { basePath: '/', handler: handlerA, method: 'GET', path: '/:id' },
      { basePath: '/', handler: handlerB, method: 'GET', path: '/:id/:name' },
    ])
  })
})

describe('routePath', () => {
  test('req.routePath', () => {
    const handlerA = () => {}
    const handlerB = () => {}
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const req = new HonoRequest<'/:id/:name'>(rawRequest, '/123/key', [
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
    ])

    expect(req.routePath).toBe('/:id')

    req.routeIndex = 1
    expect(req.routePath).toBe('/:id/:name')
  })
})

describe('req.addValidatedData() and req.data()', () => {
  const rawRequest = new Request('http://localhost')

  const payload = {
    title: 'hello',
    author: {
      name: 'young man',
      age: 20,
    },
  }

  test('add data - json', () => {
    const req = new HonoRequest<'/', { json: typeof payload }>(rawRequest)
    req.addValidatedData('json', payload)
    const data = req.valid('json')
    expect(data).toEqual(payload)
  })

  test('replace data - json', () => {
    const req = new HonoRequest<'/', { json: typeof payload }>(rawRequest)
    req.addValidatedData('json', payload)
    req.addValidatedData('json', {
      tag: ['sport', 'music'],
      author: {
        tall: 170,
      },
    })
    const data = req.valid('json')
    expect(data).toEqual({
      author: {
        tall: 170,
      },
      tag: ['sport', 'music'],
    })
  })
})

describe('headers', () => {
  test('empty string is a valid header value', () => {
    const req = new HonoRequest(new Request('http://localhost', { headers: { foo: '' } }))
    const foo = req.header('foo')
    expect(foo).toEqual('')
  })

  test('Keys of the arguments for req.header() are not case-sensitive', () => {
    const req = new HonoRequest(
      new Request('http://localhost', {
        headers: {
          'Content-Type': 'application/json',
          apikey: 'abc',
          lowercase: 'lowercase value',
        },
      })
    )
    expect(req.header('Content-Type')).toBe('application/json')
    expect(req.header('ApiKey')).toBe('abc')
  })
})

const text = '{"foo":"bar"}'
const json = { foo: 'bar' }
const buffer = new TextEncoder().encode('{"foo":"bar"}').buffer

describe('Body methods with caching', () => {
  test('req.text()', async () => {
    const req = new HonoRequest(
      new Request('http://localhost', {
        method: 'POST',
        body: text,
      })
    )
    expect(await req.text()).toEqual(text)
    expect(await req.json()).toEqual(json)
    expect(await req.arrayBuffer()).toEqual(buffer)
    expect(await req.blob()).toEqual(
      new Blob([text], {
        type: 'text/plain;charset=utf-8',
      })
    )
  })

  test('req.json()', async () => {
    const req = new HonoRequest(
      new Request('http://localhost', {
        method: 'POST',
        body: '{"foo":"bar"}',
      })
    )
    expect(await req.json()).toEqual(json)
    expect(await req.text()).toEqual(text)
    expect(await req.arrayBuffer()).toEqual(buffer)
    expect(await req.blob()).toEqual(
      new Blob([text], {
        type: 'text/plain;charset=utf-8',
      })
    )
  })

  test('req.arrayBuffer()', async () => {
    const buffer = new TextEncoder().encode('{"foo":"bar"}').buffer
    const req = new HonoRequest(
      new Request('http://localhost', {
        method: 'POST',
        body: buffer,
      })
    )
    expect(await req.arrayBuffer()).toEqual(buffer)
    expect(await req.text()).toEqual(text)
    expect(await req.json()).toEqual(json)
    expect(await req.blob()).toEqual(
      new Blob([text], {
        type: '',
      })
    )
  })

  test('req.blob()', async () => {
    const blob = new Blob(['{"foo":"bar"}'], {
      type: 'application/json',
    })
    const req = new HonoRequest(
      new Request('http://localhost', {
        method: 'POST',
        body: blob,
      })
    )
    expect(await req.blob()).toEqual(blob)
    expect(await req.text()).toEqual(text)
    expect(await req.json()).toEqual(json)
    expect(await req.arrayBuffer()).toEqual(buffer)
  })

  test('req.formData()', async () => {
    const data = new FormData()
    data.append('foo', 'bar')
    const req = new HonoRequest(
      new Request('http://localhost', {
        method: 'POST',
        body: data,
      })
    )
    expect((await req.formData()).get('foo')).toBe('bar')
    expect(async () => await req.text()).not.toThrow()
    expect(async () => await req.arrayBuffer()).not.toThrow()
    expect(async () => await req.blob()).not.toThrow()
  })

  describe('req.parseBody()', async () => {
    it('should parse form data', async () => {
      const data = new FormData()
      data.append('foo', 'bar')
      const req = new HonoRequest(
        new Request('http://localhost', {
          method: 'POST',
          body: data,
        })
      )
      expect((await req.parseBody())['foo']).toBe('bar')
      expect(async () => await req.text()).not.toThrow()
      expect(async () => await req.arrayBuffer()).not.toThrow()
      expect(async () => await req.blob()).not.toThrow()
    })

    describe('Return type', () => {
      let req: HonoRequest
      beforeEach(() => {
        const data = new FormData()
        data.append('foo', 'bar')
        req = new HonoRequest(
          new Request('http://localhost', {
            method: 'POST',
            body: data,
          })
        )
      })

      it('without options', async () => {
        expectTypeOf((await req.parseBody())['key']).toEqualTypeOf<string | File>()
      })

      it('{all: true}', async () => {
        expectTypeOf((await req.parseBody({ all: true }))['key']).toEqualTypeOf<
          string | File | (string | File)[]
        >()
      })

      it('{dot: true}', async () => {
        expectTypeOf((await req.parseBody({ dot: true }))['key']).toEqualTypeOf<
          string | File | RecursiveRecord<string, string | File>
        >()
      })

      it('{all: true, dot: true}', async () => {
        expectTypeOf((await req.parseBody({ all: true, dot: true }))['key']).toEqualTypeOf<
          | string
          | File
          | (string | File)[]
          | RecursiveRecord<string, string | File | (string | File)[]>
        >()
      })

      it('specify return type explicitly', async () => {
        expectTypeOf(
          await req.parseBody<{ key1: string; key2: string }>({ all: true, dot: true })
        ).toEqualTypeOf<{ key1: string; key2: string }>()
      })
    })
  })
})
