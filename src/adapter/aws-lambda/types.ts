// @denoify-ignore
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CognitoIdentity {
  cognitoIdentityId: string
  cognitoIdentityPoolId: string
}

export interface ClientContext {
  client: ClientContextClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Custom?: any
  env: ClientContextEnv
}

export interface ClientContextClient {
  installationId: string
  appTitle: string
  appVersionName: string
  appVersionCode: string
  appPackageName: string
}

export interface ClientContextEnv {
  platformVersion: string
  platform: string
  make: string
  model: string
  locale: string
}

/**
 * {@link Handler} context parameter.
 * See {@link https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html AWS documentation}.
 */
export interface LambdaContext {
  callbackWaitsForEmptyEventLoop: boolean
  functionName: string
  functionVersion: string
  invokedFunctionArn: string
  memoryLimitInMB: string
  awsRequestId: string
  logGroupName: string
  logStreamName: string
  identity?: CognitoIdentity | undefined
  clientContext?: ClientContext | undefined

  getRemainingTimeInMillis(): number
}

type Callback<TResult = any> = (error?: Error | string | null, result?: TResult) => void

export type Handler<TEvent = any, TResult = any> = (
  event: TEvent,
  context: LambdaContext,
  callback: Callback<TResult>
) => void | Promise<TResult>
