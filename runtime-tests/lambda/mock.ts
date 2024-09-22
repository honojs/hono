import { vi } from 'vitest'
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  LambdaFunctionUrlEvent,
} from '../../src/adapter/aws-lambda/handler'
import type { LambdaContext } from '../../src/adapter/aws-lambda/types'

type StreamifyResponseHandler = (
  handlerFunc: (
    event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | LambdaFunctionUrlEvent,
    responseStream: NodeJS.WritableStream,
    context: LambdaContext
  ) => Promise<void>
) => (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<NodeJS.WritableStream>

const mockStreamifyResponse: StreamifyResponseHandler = (handlerFunc) => {
  return async (event, context) => {
    const mockWritableStream: NodeJS.WritableStream = new (require('stream').Writable)({
      write(chunk, encoding, callback) {
        console.log('Writing chunk:', chunk.toString())
        callback()
      },
      final(callback) {
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
