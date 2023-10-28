import { LambdaContext, Handler } from './types'

declare global {
  namespace awslambda {
    function streamifyResponse(f: (event: any,
                                   responseStream: NodeJS.WritableStream,
                                   context: LambdaContext) => Promise<void>): Handler;
  }
}