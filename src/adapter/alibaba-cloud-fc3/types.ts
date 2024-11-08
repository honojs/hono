// https://www.alibabacloud.com/help/en/functioncompute/fc-3-0/user-guide/http-trigger-invoking-function
export interface AlibabaCloudFC3Event {
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
export type AlibabaCloudFC3EventRaw = Buffer

// https://www.alibabacloud.com/help/en/functioncompute/context
// real world context object:
/*
{
  callbackWaitsForEmptyEventLoop: false,
  requestId: "1-1234678-12345678-123456789012",
  credentials: {},
  function: {
    name: "hono-alibaba-cloud-fc3",
    handler: "index.handler",
    memory: 1024,
    timeout: 300
  },
  service: {
    logProject: "serverless-us-east-1-12345678-1234-1234-1234-123456789012",
    logStore: "default-logs",
    qualifier: "LATEST"
  },
  region: "us-east-1",
  accountId: "12345678790123456",
  logger: {
    requestId: "1-1234678-12345678-123456789012",
    logLevel: {
      name: "debug",
      priority: 1
    }
  },
  retryCount: 0,
  tracing: {
    openTracingSpanBaggages: {}
  }
}
*/
export interface AlibabaCloudFC3Context {
  callbackWaitsForEmptyEventLoop?: boolean // undocumented
  requestId: string
  credentials: {
    accessKeyId?: string
    accessKeySecret?: string
    securityToken?: string
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
    versionId?: string
  }
  region: string
  accountId: string
  logger: {
    requestId: string // undocumented
    logLevel: {
      name: 'debug' | 'info' | 'warn' | 'error' | 'log'
      priority: number
    } // undocumented
  }
  retryCount: number // undocumented
  tracing: {
    openTracingSpanBaggages: {} // undocumented
  } // undocumented
}

// https://www.alibabacloud.com/help/en/functioncompute/fc-3-0/user-guide/http-trigger-invoking-function
export interface AlibabaCloudFC3Response {
  statusCode: number
  headers?: {
    [key: string]: string
  }
  isBase64Encoded?: boolean
  body: string
}

export type AlibabaCloudFC3Handler = (
  event: AlibabaCloudFC3EventRaw,
  context: AlibabaCloudFC3Context
) => Promise<AlibabaCloudFC3Response>
