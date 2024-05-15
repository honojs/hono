import { parseBody } from './body'

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

    expect(await parseBody(req, { all: true, dot: true })).toEqual({
      file: { file1, file2 },
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

    expect(await parseBody(req, { all: true })).toEqual({
      file: [file1, file2],
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
})
