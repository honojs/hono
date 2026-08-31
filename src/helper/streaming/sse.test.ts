import { SSEStreamingApi } from './sse'

const makeApi = () => {
  const { readable, writable } = new TransformStream<Uint8Array>()
  const api = new SSEStreamingApi(writable, readable)
  return api
}

const readAll = async (readable: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(
    chunks.reduce((a, b) => {
      const merged = new Uint8Array(a.length + b.length)
      merged.set(a)
      merged.set(b, a.length)
      return merged
    }, new Uint8Array())
  )
}

describe('SSEStreamingApi', () => {
  it('writes a basic data message', async () => {
    const api = makeApi()
    await api.writeSSE({ data: 'hello' })
    api.close()
    expect(await readAll(api.responseReadable)).toBe('data: hello\n\n')
  })

  it('writes event, id, and retry fields', async () => {
    const api = makeApi()
    await api.writeSSE({ data: 'msg', event: 'update', id: '42', retry: 3000 })
    api.close()
    expect(await readAll(api.responseReadable)).toBe('event: update\ndata: msg\nid: 42\nretry: 3000\n\n')
  })

  it('splits multi-line data into multiple data: lines', async () => {
    const api = makeApi()
    await api.writeSSE({ data: 'line1\nline2' })
    api.close()
    expect(await readAll(api.responseReadable)).toBe('data: line1\ndata: line2\n\n')
  })

  it('throws when event contains CR or LF', async () => {
    const api = makeApi()
    await expect(api.writeSSE({ data: 'x', event: 'foo\nbar' })).rejects.toThrow(
      'event must not contain "\\r" or "\\n"'
    )
  })

  it('throws when id contains CR or LF', async () => {
    const api = makeApi()
    await expect(api.writeSSE({ data: 'x', id: 'id\r\ninjected' })).rejects.toThrow(
      'id must not contain "\\r" or "\\n"'
    )
  })

  it('throws when retry is NaN', async () => {
    const api = makeApi()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(api.writeSSE({ data: 'x', retry: NaN as any })).rejects.toThrow(
      'retry must be a finite number'
    )
  })

  it('throws when retry is Infinity', async () => {
    const api = makeApi()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(api.writeSSE({ data: 'x', retry: Infinity as any })).rejects.toThrow(
      'retry must be a finite number'
    )
  })

  it('throws when retry is a CRLF-containing string (as any bypass)', async () => {
    const api = makeApi()
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      api.writeSSE({ data: 'hello', retry: '0\r\nevent: injected\r\ndata: pwned\r\n\r\n' as any })
    ).rejects.toThrow('retry must be a finite number')
  })

  it('accepts a valid finite retry value', async () => {
    const api = makeApi()
    await api.writeSSE({ data: 'ok', retry: 5000 })
    api.close()
    const text = await readAll(api.responseReadable)
    expect(text).toContain('retry: 5000')
  })
})
