// @denoify-ignore
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LambdaContext, Handler } from './types'

type METADATA_PRELUDE_CONTENT_TYPE = string

declare global {
  namespace awslambda {
    export class HttpResponseStream {
      static from(underlyingStream: NodeJS.WritableStream, prelude: Record<string, unknown>): NodeJS.WritableStream {
        underlyingStream['setContentType'](METADATA_PRELUDE_CONTENT_TYPE)

        // JSON.stringify is required. NULL byte is not allowed in metadataPrelude.
        const metadataPrelude = JSON.stringify(prelude)

        underlyingStream['_onBeforeFirstWrite'] = (write: (chunk: any) => void) => {
          write(Buffer.from(metadataPrelude, 'utf8'))

          // Write 8 null bytes after the JSON prelude.
          write(Buffer.alloc(DELIMITER_LEN, 0))
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
