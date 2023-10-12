// https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/blob/main/src/types/awslambda.d.ts
import { Context, Handler } from 'aws-lambda';

declare global {
  namespace awslambda {
    function streamifyResponse(f: (event: any,
                                   responseStream: NodeJS.WritableStream,
                                   context: Context) => Promise<void>): Handler;
  }
}