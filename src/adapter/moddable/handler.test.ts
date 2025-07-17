import { createHandleFunction, Socket, SocketInit } from "./handler"

describe('handler', () => {
  it ('Should create a HTTP response', () => {
    class MockSocket implements Socket {
      constructor(opts: SocketInit) {

      }
      callback: (this: { read(type: typeof ArrayBuffer): ArrayBuffer }, message: number, value?: unknown) => void = () => null
      write(chunk: ArrayBuffer): void {
        
      }
      close(): void {
        
      }
    }
    const handle = createHandleFunction(MockSocket)
    const callback = handle({
      fetch: () => new Response('Hello World')
    })
    const socket = 
    callback.call({
      callback: () => {

      }
    })
    
  })


})