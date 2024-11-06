// https://help.aliyun.com/zh/functioncompute/fc-3-0/user-guide/http-trigger-invoking-function
export interface AliyunFCEvent {
  version: string
  rawPath: string
  body: string
  isBase64Encoded: boolean
  headers: {
    [key: string]: string
  }
  queryParameters: {
    [key: string]: string
  }
  requestContext: {
    accountId: string
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
    time: string
    timeEpoch: string
  }
}

// don't know why it's a buffer
// can't find the related document
export type AliyunFCEventRaw = Buffer

// https://help.aliyun.com/zh/functioncompute/context
export interface AliyunFCContext {
  requestId: string
  credentials: {
    accessKeyId: string
    accessKeySecret: string
    securityToken: string
  }
  function: {
    name: string
    handler: string
    memory: number
    timeout: number
  }
  service: {
    logProject: string
    logStore: string
    qualifier: string
    versionId: string
  }
  region: string
  accountId: string
  logger: {
    debug: (message: string) => void
    info: (message: string) => void
    warn: (message: string) => void
    error: (message: string) => void
    log: (message: string) => void
  }
}

export interface AliyunFCResponse {
  statusCode: number
  headers?: {
    [key: string]: string
  }
  isBase64Encoded?: boolean
  body: string
}

export type AliyunFCHandler = (
  event: AliyunFCEventRaw,
  context: AliyunFCContext
) => Promise<AliyunFCResponse>
