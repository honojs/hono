import type {
  Context as AzureFunctionsContext,
  HttpRequest as AzureFunctionsHttpRequest,
} from '@azure/functions'
import type { Hono } from '../../hono'

export interface AzureFunctionsHTTPEvent {
  context: AzureFunctionsContext
  req: AzureFunctionsHttpRequest
}

export const handle = (app: Hono) => {
  return async (event: AzureFunctionsHTTPEvent): Promise<AzureFunctionsContext> => {
    const req = createRequest(event)
    const res = await app.fetch(req)

    return createResult(event.context, res)
  }
}

const createRequest = (event: AzureFunctionsHTTPEvent): Request => {
  const urlPath = event.req.url
  const url = urlPath

  const headersKV = {}
  for (const [k, v] of Object.entries(event.req.headers)) {
    if (v) headersKV[k] = v
  }

  const headers = new Headers(headersKV)

  const method = event.req.method
  const requestInit: RequestInit = {
    headers,
    method,
  }

  if (event.req.body) {
    requestInit.body = JSON.stringify(event.req.body)
  }

  return new Request(url, requestInit)
}

const createResult = async (
  context: AzureFunctionsContext,
  res: Response
): Promise<AzureFunctionsContext> => {
  const contentType = res.headers.get('content-type')

  res.headers.forEach((value, key) => {
    context.res.headers[key] = value
  })

  context.res.headers['Content-Type'] = contentType ?? 'text/plain'
  context.res.body = await res.text()

  return context
}
