import { vi } from 'vitest'
import type { LambdaEvent } from '../../src/adapter/aws-lambda/handler'
import type { LambdaContext } from '../../src/adapter/aws-lambda/types'

type StreamifyResponseHandler = (
  handlerFunc: (
    event: LambdaEvent,
    responseStream: NodeJS.WritableStream,
    context: LambdaContext
  ) => Promise<void>
) => (event: LambdaEvent, context: LambdaContext) => Promise<NodeJS.WritableStream>

const mockStreamifyResponse: StreamifyResponseHandler = (handlerFunc) => {
  return async (event, context) => {
    const mockWritableStream: NodeJS.WritableStream = new (require('stream').Writable)({
      write(chunk: Buffer, _encoding: string, callback: () => void) {
        console.log('Writing chunk:', chunk.toString())
        callback()
      },
      final(callback: () => void) {
        console.log('Finalizing stream.')
        callback()
      },
    })
    mockWritableStream.on('finish', () => {
      console.log('Stream has finished')
    })
    await handlerFunc(event, mockWritableStream, context)
    mockWritableStream.end()
    return mockWritableStream
  }
}

const awslambda = {
  streamifyResponse: mockStreamifyResponse,
}

vi.stubGlobal('awslambda', awslambda)
