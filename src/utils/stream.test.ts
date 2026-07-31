import { StreamingApi } from './stream'

describe('StreamingApi', () => {
  it('write(string)', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable, readable)
    const reader = api.responseReadable.getReader()
    api.write('foo')
    expect((await reader.read()).value).toEqual(new TextEncoder().encode('foo'))
    api.write('bar')
    expect((await reader.read()).value).toEqual(new TextEncoder().encode('bar'))
  })

  it('write(Uint8Array)', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable, readable)
    const reader = api.responseReadable.getReader()
    api.write(new Uint8Array([1, 2, 3]))
    expect((await reader.read()).value).toEqual(new Uint8Array([1, 2, 3]))
    api.write(new Uint8Array([4, 5, 6]))
    expect((await reader.read()).value).toEqual(new Uint8Array([4, 5, 6]))
  })

  it('writeln(string)', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable, readable)
    const reader = api.responseReadable.getReader()
    api.writeln('foo')
    expect((await reader.read()).value).toEqual(new TextEncoder().encode('foo\n'))
    api.writeln('bar')
    expect((await reader.read()).value).toEqual(new TextEncoder().encode('bar\n'))
  })

  it('pipe()', async () => {
    const { readable: senderReadable, writable: senderWritable } = new TransformStream()

    // send data to readable in other scope
    ;(async () => {
      const writer = senderWritable.getWriter()
      await writer.write(new TextEncoder().encode('foo'))
      await writer.write(new TextEncoder().encode('bar'))
      // await writer.close()
    })()

    const { readable: receiverReadable, writable: receiverWritable } = new TransformStream()

    const api = new StreamingApi(receiverWritable, receiverReadable)

    // pipe readable to api in other scope
    ;(async () => {
      await api.pipe(senderReadable)
    })()

    // read data from api
    const reader = api.responseReadable.getReader()
    expect((await reader.read()).value).toEqual(new TextEncoder().encode('foo'))
    expect((await reader.read()).value).toEqual(new TextEncoder().encode('bar'))
  })

  it('pipe() re-acquires the writer when the source errors', async () => {
    const { readable: receiverReadable, writable: receiverWritable } = new TransformStream()
    const api = new StreamingApi(receiverWritable, receiverReadable)

    const erroringSource = new ReadableStream({
      pull(controller) {
        controller.error(new Error('boom'))
      },
    })

    await expect(api.pipe(erroringSource)).rejects.toThrow('boom')

    // The writer must be re-acquired even when pipe() rejects, so the instance is
    // never left holding a released writer. Without the fix the lock stays released.
    expect((api as unknown as { writable: WritableStream }).writable.locked).toBe(true)
    await expect(api.write('x')).resolves.toBe(api)
    await expect(api.close()).resolves.toBeUndefined()

    // Observe the aborted readable so it does not surface as an unhandled rejection.
    const reader = api.responseReadable.getReader()
    await expect(reader.read()).rejects.toThrow('boom')
  })

  it('close()', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable, readable)
    const reader = api.responseReadable.getReader()
    await api.close()
    expect((await reader.read()).done).toBe(true)
  })

  it('should not throw an error in write()', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable, readable)
    await api.close()
    const write = () => api.write('foo')
    expect(write).not.toThrow()
  })

  it('should not throw an error in close()', async () => {
    const { readable, writable } = new TransformStream()
    const api = new StreamingApi(writable, readable)
    const close = async () => {
      await api.close()
      await api.close()
    }
    expect(close).not.toThrow()
  })

  it('onAbort()', async () => {
    const { readable, writable } = new TransformStream()
    const handleAbort1 = vi.fn()
    const handleAbort2 = vi.fn()
    const api = new StreamingApi(writable, readable)
    api.onAbort(handleAbort1)
    api.onAbort(handleAbort2)
    expect(handleAbort1).not.toBeCalled()
    expect(handleAbort2).not.toBeCalled()
    await api.responseReadable.cancel()
    expect(handleAbort1).toBeCalled()
    expect(handleAbort2).toBeCalled()
  })

  it('abort()', async () => {
    const { readable, writable } = new TransformStream()
    const handleAbort1 = vi.fn()
    const handleAbort2 = vi.fn()
    const api = new StreamingApi(writable, readable)
    api.onAbort(handleAbort1)
    api.onAbort(handleAbort2)
    expect(handleAbort1).not.toBeCalled()
    expect(handleAbort2).not.toBeCalled()
    expect(api.aborted).toBe(false)

    api.abort()
    expect(handleAbort1).toHaveBeenCalledOnce()
    expect(handleAbort2).toHaveBeenCalledOnce()
    expect(api.aborted).toBe(true)

    api.abort()
    expect(handleAbort1).toHaveBeenCalledOnce()
    expect(handleAbort2).toHaveBeenCalledOnce()
    expect(api.aborted).toBe(true)
  })
})
