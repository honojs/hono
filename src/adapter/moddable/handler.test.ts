import type { Socket, SocketConstructor, SocketInit } from './handler'
import { createHandleFunction } from './handler'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

describe('handler', () => {
  it('Should create a HTTP response', async () => {
    let MockSocket!: SocketConstructor
    let socket!: Socket
    const responsePromise = new Promise((resolve) => {
      let response: string = ''
      MockSocket = class implements Socket {
        constructor(opts: SocketInit) {
          socket = this
        }
        callback: (
          this: { read(type: typeof ArrayBuffer): ArrayBuffer },
          message: number,
          value?: unknown
        ) => void = () => null
        write(chunk: ArrayBuffer): void {
          response += decoder.decode(chunk)
        }
        close(): void {
          resolve(response)
        }
      }
    })
    const handle = createHandleFunction(MockSocket)
    const callback = handle({
      fetch: () => new Response('Hello World'),
    })
    callback.call({
      callback: () => {},
    })
    socket.callback.call(
      {
        read() {
          return encoder.encode('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n').buffer
        },
      },
      2
    )
    expect(await responsePromise).toEqual(
      'HTTP/1.1 200 \r\ncontent-type: text/plain;charset=UTF-8\r\n\r\nHello World'
    )
  })
  it('Should close the socket on invalid request', async () => {
    let MockSocket!: SocketConstructor
    let socket!: Socket
    const responsePromise = new Promise((resolve) => {
      let response: string = ''
      MockSocket = class implements Socket {
        constructor(opts: SocketInit) {
          socket = this
        }
        callback: (
          this: { read(type: typeof ArrayBuffer): ArrayBuffer },
          message: number,
          value?: unknown
        ) => void = () => null
        write(chunk: ArrayBuffer): void {
          response += decoder.decode(chunk)
        }
        close(): void {
          resolve(response)
        }
      }
    })
    const handle = createHandleFunction(MockSocket)
    const callback = handle({
      fetch: () => new Response('Hello World'),
    })
    callback.call({
      callback: () => {},
    })
    socket.callback.call(
      {
        read() {
          return encoder.encode('aa\r\n\r\n').buffer
        },
      },
      2
    )
    expect(await responsePromise).toEqual('')
  })
})
