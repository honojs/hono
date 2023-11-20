// @denoify-ignore
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LambdaContext, Handler } from './types'

declare global {
  namespace awslambda {
    // Note: Anticipated logic for AWS
    // https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/blob/main/src/HttpResponseStream.js
    export class HttpResponseStream {
      static from(
        underlyingStream: NodeJS.WritableStream,
        prelude: Record<string, unknown>
      ): NodeJS.WritableStream
    }
    function streamifyResponse(
      f: (
        event: any,
        responseStream: NodeJS.WritableStream,
        context: LambdaContext
      ) => Promise<void>
    ): Handler
  }
}
