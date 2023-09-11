import { StreamingApi } from './stream'

describe('StreamingApi', () => {
  it('write()', async () => {
    const writable = new WritableStream()
    const api = new StreamingApi(writable)
    api.write('foo')
    expect(api.buffer).toEqual(['foo'])
    api.write('bar')
    expect(api.buffer).toEqual(['foo', 'bar'])
  })

  it('writeln()', async () => {
    const writable = new WritableStream()
    const api = new StreamingApi(writable)
    api.writeln('foo')
    expect(api.buffer).toEqual(['foo\n'])
    api.writeln('bar')
    expect(api.buffer).toEqual(['foo\n', 'bar\n'])
  })

  it('clear()', async () => {
    const writable = new WritableStream()
    const api = new StreamingApi(writable)
    api.write('foo')
    api.clear()
    expect(api.buffer).toEqual([])
  })

  it('flush()', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable)
    const encoder = new TextEncoder()
    const reader = readable.getReader()
    ;(async () => {
      await api.write('foo').flush()
      await api.writeln('bar').flush()
    })()
    const { value } = await reader.read()
    expect(value).toEqual(encoder.encode('foo'))
    const { value: value2 } = await reader.read()
    expect(value2).toEqual(encoder.encode('bar\n'))
  })

  it('close()', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable)
    const reader = readable.getReader()
    api.write('foo')
    api.close()
    await expect(api.flush()).rejects.toThrow()
    await expect(api.close()).rejects.toThrow()
    const { value } = await reader.read()
    expect(value).toEqual(undefined)
  })
})
