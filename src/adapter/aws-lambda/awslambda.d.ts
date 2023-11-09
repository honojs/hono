// @denoify-ignore
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LambdaContext, Handler } from './types'

declare global {
  namespace awslambda {
    export class HttpResponseStream {
      static from(
        underlyingStream: NodeJS.WritableStream,
        prelude: Record<string, unknown>
      ): NodeJS.WritableStream {
        underlyingStream.setContentType('application/vnd.awslambda.http-integration-response')

        // JSON.stringify is required. NULL byte is not allowed in metadataPrelude.
        const metadataPrelude = JSON.stringify(prelude)

        underlyingStream['_onBeforeFirstWrite'] = (write: (chunk: any) => void) => {
          write(Buffer.from(metadataPrelude, 'utf8'))

          // Write 8 null bytes after the JSON prelude.
          write(Buffer.alloc(8, 0))
        }

        return underlyingStream
      }
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
