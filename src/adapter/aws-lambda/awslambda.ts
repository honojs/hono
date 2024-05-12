/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LambdaContext, Handler } from './types'

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace awslambda {
  // Note: Anticipated logic for AWS
  // https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/blob/main/src/HttpResponseStream.js
  export class HttpResponseStream {
    // @ts-expect-error it should throw a type error
    static from(
      underlyingStream: NodeJS.WritableStream,
      prelude: Record<string, unknown>
    ): NodeJS.WritableStream
  }
  // @ts-expect-error it should throw a type error
  export function streamifyResponse(
    f: (event: any, responseStream: NodeJS.WritableStream, context: LambdaContext) => Promise<void>
  ): Handler
}
