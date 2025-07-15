import type { Socket } from "socket"

export function createStreamFromSocket(socket: Socket) {
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      socket.callback = function (message, value) {
        switch (message) {
          case -2: {
            // error
            controller.error(value)
            break
          }
          case -1: {
            // close
            controller.close()
            break
          }
          case 1: {
            // connect
            break
          }
          case 2: {
            // received data
            if (value) {
              const buff = new Uint8Array(this.read(ArrayBuffer))
              controller.enqueue(buff)
            }
          }
        }
      }
    }
  })
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      socket.write(chunk)
    },
    close() {
      socket.close()
    }
  })
  return {
    readable,
    writable
  }
}
