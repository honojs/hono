// @denoify-ignore

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
}

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

export interface ALBRequestContext {
  elb: {
    targetGroupArn: string
  }
}
