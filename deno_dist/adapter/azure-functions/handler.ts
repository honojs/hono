import type { Hono } from '../../hono.ts'
import type {
  Context as AzureFunctionsContext,
} from './Context/index.ts'
import type {
  HttpRequest as AzureFunctionsHttpRequest,
} from './http/index.ts'

export interface AzureFunctionsHTTPEvent {
  context: AzureFunctionsContext
  req: AzureFunctionsHttpRequest
}

export const handle = (app: Hono) => {
  return async (event: AzureFunctionsHTTPEvent): Promise<AzureFunctionsContext> => {
    try {
      const req = createRequest(event)
      const res = await app.fetch(req)

      return createResult(event.context, res)
    } catch (err) {
      event.context.log.error(err)
      event.context.res = {
        status: 500,
        body: err,
      }
      return event.context
    }
  }
}

const createRequest = (event: AzureFunctionsHTTPEvent): Request => {
  const urlPath = event.req.url
  const url = urlPath ?? ''

  const headersKV: { [key: string]: string } = {}
  for (const [k, v] of Object.entries(event.req.headers)) {
    if (v !== undefined) headersKV[k] = v as string
  }

  const headers = new Headers(headersKV)

  const method = event.req.method ?? 'GET'
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
  if (context.res === undefined) context.res = {} 
  if (context.res.headers === undefined) context.res.headers = {} 

  for (const [k, v] of Object.entries(res.headers)) {
    context.res.headers[k] = v
  }

  const contentType = res.headers.get('content-type')
  context.res.headers['Content-Type'] = contentType ?? 'text/plain'
  context.res.body = await res.text()

  return context
}
