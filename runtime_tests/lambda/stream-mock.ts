import { vi } from 'vitest'
import { Writable } from 'node:stream'
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
} from '../../src/adapter/aws-lambda/handler'
import type { LambdaContext } from '../../src/adapter/aws-lambda/types'

type StreamifyResponseHandler = (
  handlerFunc: (
    event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
    responseStream: Writable,
    context: LambdaContext
  ) => Promise<void>
) => (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<NodeJS.WritableStream>

const mockStreamifyResponse: StreamifyResponseHandler = (handlerFunc) => {
  return async (event, context) => {
    const chunks = []
    const mockWritableStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk)
        callback()
      },
    })
    mockWritableStream.chunks = chunks
    await handlerFunc(event, mockWritableStream, context)
    mockWritableStream.end()
    return mockWritableStream
  }
}

const awslambda = {
  streamifyResponse: mockStreamifyResponse,
  HttpResponseStream: {
    from: (stream: Writable, httpResponseMetadata: unknown): Writable => {
      stream.write(Buffer.from(JSON.stringify(httpResponseMetadata)))
      return stream
    },
  },
}

vi.stubGlobal('awslambda', awslambda)
