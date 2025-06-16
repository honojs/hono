import { parseBody } from './body'
import type { BodyData } from './body'

type RecursiveRecord<K extends string, T> = {
  [key in K]: T | RecursiveRecord<K, T>
}

describe('Parse Body Util', () => {
  const FORM_URL = 'https://localhost/form'
  const SEARCH_URL = 'https://localhost/search'

  const createRequest = (
    url: string,
    method: 'POST',
    body: BodyInit,
    headers?: { [key: string]: string }
  ) => {
    return new Request(url, {
      method,
      body,
      headers,
    })
  }

  it('should parse `multipart/form-data`', async () => {
    const data = new FormData()
    data.append('message', 'hello')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req)).toEqual({ message: 'hello' })
  })

  it('should parse `x-www-form-urlencoded`', async () => {
    const searchParams = new URLSearchParams()
    searchParams.append('message', 'hello')

    const req = createRequest(SEARCH_URL, 'POST', searchParams, {
      'Content-Type': 'application/x-www-form-urlencoded',
    })

    expect(await parseBody(req)).toEqual({ message: 'hello' })
  })

  it('should not parse multiple values in default', async () => {
    const data = new FormData()
    data.append('file', 'bbb')
    data.append('message', 'hello')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req)).toEqual({
      file: 'bbb',
      message: 'hello',
    })
  })

  it('should not update file object properties', async () => {
    const file = new File(['foo'], 'file1', {
      type: 'application/octet-stream',
    })
    const data = new FormData()

    const req = createRequest(FORM_URL, 'POST', data)
    vi.spyOn(req, 'formData').mockImplementation(
      async () =>
        ({
          forEach: (cb) => {
            cb(file, 'file', data)
            cb('hoo', 'file.hoo', data)
          },
        } as FormData)
    )

    const parsedData = await parseBody(req, { dot: true })
    expect(parsedData.file).not.instanceOf(File)
    expect(parsedData).toEqual({
      file: {
        hoo: 'hoo',
      },
    })
  })

  it('should override value if `all` option is false', async () => {
    const data = new FormData()
    data.append('file', 'aaa')
    data.append('file', 'bbb')
    data.append('message', 'hello')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req)).toEqual({
      file: 'bbb',
      message: 'hello',
    })
  })

  it('should parse multiple values if `all` option is true', async () => {
    const data = new FormData()
    data.append('file', 'aaa')
    data.append('file', 'bbb')
    data.append('message', 'hello')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { all: true })).toEqual({
      file: ['aaa', 'bbb'],
      message: 'hello',
    })
  })

  it('should not parse nested values in default', async () => {
    const data = new FormData()
    data.append('obj.key1', 'value1')
    data.append('obj.key2', 'value2')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { dot: false })).toEqual({
      'obj.key1': 'value1',
      'obj.key2': 'value2',
    })
  })

  it('should not parse nested values in default for non-nested keys', async () => {
    const data = new FormData()
    data.append('key1', 'value1')
    data.append('key2', 'value2')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { dot: false })).toEqual({
      key1: 'value1',
      key2: 'value2',
    })
  })

  it('should handle nested values and non-nested values together with dot option true', async () => {
    const data = new FormData()
    data.append('obj.key1', 'value1')
    data.append('obj.key2', 'value2')
    data.append('key3', 'value3')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { dot: true })).toEqual({
      obj: { key1: 'value1', key2: 'value2' },
      key3: 'value3',
    })
  })

  it('should handle deeply nested objects with dot option true', async () => {
    const data = new FormData()
    data.append('a.b.c.d', 'value')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { dot: true })).toEqual({
      a: { b: { c: { d: 'value' } } },
    })
  })

  it('should parse nested values if `dot` option is true', async () => {
    const data = new FormData()
    data.append('obj.key1', 'value1')
    data.append('obj.key2', 'value2')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { dot: true })).toEqual({
      obj: { key1: 'value1', key2: 'value2' },
    })
  })

  it('should parse data if both `all` and `dot` are set', async () => {
    const data = new FormData()
    data.append('obj.sub.foo', 'value1')
    data.append('obj.sub.foo', 'value2')
    data.append('key', 'value3')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { dot: true, all: true })).toEqual({
      obj: { sub: { foo: ['value1', 'value2'] } },
      key: 'value3',
    })
  })

  it('should parse nested values if values are `File`', async () => {
    const file1 = new File(['foo'], 'file1', {
      type: 'application/octet-stream',
    })
    const file2 = new File(['bar'], 'file2', {
      type: 'application/octet-stream',
    })
    const data = new FormData()
    data.append('file.file1', file1)
    data.append('file.file2', file2)

    const req = createRequest(FORM_URL, 'POST', data)

    const result = await parseBody(req, { all: true, dot: true })
    expect(result).toMatchObject({
      file: {
        file1: { name: 'file1', type: 'application/octet-stream' },
        file2: { name: 'file2', type: 'application/octet-stream' },
      },
    })
  })

  it('should parse multiple values if values are `File`', async () => {
    const file1 = new File(['foo'], 'file1', {
      type: 'application/octet-stream',
    })
    const file2 = new File(['bar'], 'file2', {
      type: 'application/octet-stream',
    })
    const data = new FormData()
    data.append('file', file1)
    data.append('file', file2)

    const req = createRequest(FORM_URL, 'POST', data)

    const result = await parseBody(req, { all: true })
    expect(result).toMatchObject({
      file: [
        { name: 'file1', type: 'application/octet-stream' },
        { name: 'file2', type: 'application/octet-stream' },
      ],
    })
  })

  it('should parse multiple values if key ends with `[]`', async () => {
    const data = new FormData()
    data.append('file[]', 'aaa')
    data.append('file[]', 'bbb')
    data.append('message', 'hello')

    const req = createRequest(FORM_URL, 'POST', data)

    expect(await parseBody(req, { all: true })).toEqual({
      'file[]': ['aaa', 'bbb'],
      message: 'hello',
    })
  })

  it('should return blank object if body is JSON', async () => {
    const payload = { message: 'hello hono' }

    const req = createRequest('http://localhost/json', 'POST', JSON.stringify(payload), {
      'Content-Type': 'application/json',
    })

    expect(await parseBody(req)).toEqual({})
  })

  describe('Return type', () => {
    let req: Request
    beforeEach(() => {
      req = createRequest(FORM_URL, 'POST', new FormData())
    })

    it('without options', async () => {
      expectTypeOf((await parseBody(req))['key']).toEqualTypeOf<string | File>()
    })

    it('{all: true}', async () => {
      expectTypeOf((await parseBody(req, { all: true }))['key']).toEqualTypeOf<
        string | File | (string | File)[]
      >()
    })

    it('{all: boolean}', async () => {
      expectTypeOf((await parseBody(req, { all: !!Math.random() }))['key']).toEqualTypeOf<
        string | File | (string | File)[]
      >()
    })

    it('{dot: true}', async () => {
      expectTypeOf((await parseBody(req, { dot: true }))['key']).toEqualTypeOf<
        string | File | RecursiveRecord<string, string | File>
      >()
    })

    it('{dot: boolean}', async () => {
      expectTypeOf((await parseBody(req, { dot: !!Math.random() }))['key']).toEqualTypeOf<
        string | File | RecursiveRecord<string, string | File>
      >()
    })

    it('{all: true, dot: true}', async () => {
      expectTypeOf((await parseBody(req, { all: true, dot: true }))['key']).toEqualTypeOf<
        | string
        | File
        | (string | File)[]
        | RecursiveRecord<string, string | File | (string | File)[]>
      >()
    })

    it('{all: boolean, dot: boolean}', async () => {
      expectTypeOf(
        (await parseBody(req, { all: !!Math.random(), dot: !!Math.random() }))['key']
      ).toEqualTypeOf<
        | string
        | File
        | (string | File)[]
        | RecursiveRecord<string, string | File | (string | File)[]>
      >()
    })

    it('specify return type explicitly', async () => {
      expectTypeOf(
        await parseBody<{ key1: string; key2: string }>(req, {
          all: !!Math.random(),
          dot: !!Math.random(),
        })
      ).toEqualTypeOf<{ key1: string; key2: string }>()
    })
  })
})

describe('BodyData', () => {
  it('without options', async () => {
    expectTypeOf(({} as BodyData)['key']).toEqualTypeOf<string | File>()
  })

  it('{all: true}', async () => {
    expectTypeOf(({} as BodyData<{ all: true }>)['key']).toEqualTypeOf<
      string | File | (string | File)[]
    >()
  })

  it('{all: boolean}', async () => {
    expectTypeOf(({} as BodyData<{ all: boolean }>)['key']).toEqualTypeOf<
      string | File | (string | File)[]
    >()
  })

  it('{dot: true}', async () => {
    expectTypeOf(({} as BodyData<{ dot: true }>)['key']).toEqualTypeOf<
      string | File | RecursiveRecord<string, string | File>
    >()
  })

  it('{dot: boolean}', async () => {
    expectTypeOf(({} as BodyData<{ dot: boolean }>)['key']).toEqualTypeOf<
      string | File | RecursiveRecord<string, string | File>
    >()
  })

  it('{all: true, dot: true}', async () => {
    expectTypeOf(({} as BodyData<{ all: true; dot: true }>)['key']).toEqualTypeOf<
      string | File | (string | File)[] | RecursiveRecord<string, string | File | (string | File)[]>
    >()
  })

  it('{all: boolean, dot: boolean}', async () => {
    expectTypeOf(({} as BodyData<{ all: boolean; dot: boolean }>)['key']).toEqualTypeOf<
      string | File | (string | File)[] | RecursiveRecord<string, string | File | (string | File)[]>
    >()
  })
})
