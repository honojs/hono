import type { Socket } from "../handler"
import { createStreamFromSocket } from "./socket-to-webstream"

describe('createStreamFromSocket', () => {
  it('Should create writable stream from socket', async () => {
    const writeMock = vi.fn()
    let promise!: Promise<void>
    let resolve!: () => void
    promise = new Promise((res) => {
      resolve = res
    })
    class MockSocket implements Socket {
      callback: (this: { read(type: typeof ArrayBuffer): ArrayBuffer }, message: number, value?: unknown) => void = () => null
      write(data: Uint8Array) {
        console.log('write', data)
        writeMock(data)
      }
      close() {
        resolve()
      }
    }
    const writer = createStreamFromSocket(new MockSocket()).writable.getWriter()
    writer.write(new Uint8Array([1, 2, 3]))
    writer.close()
    await promise
    expect(writeMock).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
  })
  it('Should throw an error when socket callback receives an error message', async () => {
    class MockSocket implements Socket {
      callback: (this: { read(type: typeof ArrayBuffer): ArrayBuffer }, message: number, value?: unknown) => void = () => null
      write(data: Uint8Array) {
        console.log('write', data)
      }
      close() {}
    }
    const socket = new MockSocket()
    const reader = createStreamFromSocket(socket).readable.getReader()
    socket.callback.call({
      read: () => new ArrayBuffer(0)
    }, -2, 'this is an error')
    expect(reader.read()).rejects.toThrow()
  })
  it('Should close the stream when socket is closed', async () => {
    class MockSocket implements Socket {
      callback: (this: { read(type: typeof ArrayBuffer): ArrayBuffer }, message: number, value?: unknown) => void = () => null
      write(data: Uint8Array) {
        console.log('write', data)
      }
      close() {}
    }
    const socket = new MockSocket()
    const reader = createStreamFromSocket(socket).readable.getReader()
    socket.callback.call({
      read: () => new ArrayBuffer(0)
    }, -1)
    expect(await reader.read()).toEqual({ done: true, value: undefined })
  })
})
