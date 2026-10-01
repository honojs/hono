/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export interface CognitoIdentity {
  cognitoIdentityId: string
  cognitoIdentityPoolId: string
}

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export interface ClientContext {
  client: ClientContextClient

  Custom?: any
  env: ClientContextEnv
}

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export interface ClientContextClient {
  installationId: string
  appTitle: string
  appVersionName: string
  appVersionCode: string
  appPackageName: string
}

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
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
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
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

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export type Handler<TEvent = any, TResult = any> = (
  event: TEvent,
  context: LambdaContext,
  callback: Callback<TResult>
) => void | Promise<TResult>

interface ClientCert {
  clientCertPem: string
  subjectDN: string
  issuerDN: string
  serialNumber: string
  validity: {
    notBefore: string
    notAfter: string
  }
}

interface Identity {
  accessKey?: string
  accountId?: string
  caller?: string
  cognitoAuthenticationProvider?: string
  cognitoAuthenticationType?: string
  cognitoIdentityId?: string
  cognitoIdentityPoolId?: string
  principalOrgId?: string
  sourceIp: string
  user?: string
  userAgent: string
  userArn?: string
  clientCert?: ClientCert
}

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export interface ApiGatewayRequestContext {
  accountId: string
  apiId: string
  authorizer: {
    claims?: unknown
    scopes?: unknown
  }
  domainName: string
  domainPrefix: string
  extendedRequestId: string
  httpMethod: string
  identity: Identity
  path: string
  protocol: string
  requestId: string
  requestTime: string
  requestTimeEpoch: number
  resourceId?: string
  resourcePath: string
  stage: string
}

interface Authorizer {
  iam?: {
    accessKey: string
    accountId: string
    callerId: string
    cognitoIdentity: null
    principalOrgId: null
    userArn: string
    userId: string
  }
  jwt?: {
    claims: Record<string, string | number | boolean | string[]>
    scopes: string[] | null
  }
  /**
   * The `context` object returned by a Lambda (REQUEST) authorizer.
   * It is `null` when the authorizer returns no context.
   */
  lambda?: Record<string, unknown> | null
}

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export interface ApiGatewayRequestContextV2 {
  accountId: string
  apiId: string
  authentication: null
  authorizer: Authorizer
  domainName: string
  domainPrefix: string
  http: {
    method: string
    path: string
    protocol: string
    sourceIp: string
    userAgent: string
  }
  requestId: string
  routeKey: string
  stage: string
  time: string
  timeEpoch: number
}

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export interface ALBRequestContext {
  elb: {
    targetGroupArn: string
  }
}

/**
 * @deprecated `hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead.
 */
export interface LatticeRequestContextV2 {
  serviceNetworkArn: string
  serviceArn: string
  targetGroupArn: string
  region: string
  timeEpoch: string
  identity: {
    sourceVpcArn?: string
    type?: string
    principal?: string
    principalOrgID?: string
    sessionName?: string
    x509IssuerOu?: string
    x509SanDns?: string
    x509SanNameCn?: string
    x509SanUri?: string
    x509SubjectCn?: string
  }
}
