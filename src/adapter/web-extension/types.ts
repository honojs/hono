export interface WebRequestBody {
  formData?: Record<string, string[]>
  raw?: Array<{ bytes?: ArrayBuffer; file?: string }>
}

export interface WebRequestDetails {
  documentId?: string
  documentLifecycle?: string
  frameId: number
  frameType?: string
  initiator?: string
  method: string
  parentFrameId: number
  requestBody?: WebRequestBody
  requestId: string
  tabId: number
  timeStamp: number
  type: string
  url: string
}

export interface BlockingResponse {
  cancel?: boolean
  redirectUrl?: string
}

export interface RequestFilter {
  tabId?: number
  types?: string[]
  urls: string[]
  windowId?: number
}
