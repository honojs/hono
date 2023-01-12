import type { StatusCode } from './http-status'
import { getStatusText } from './http-status'

type HTTPExceptionOptions = {
  res?: Response
  message?: string
}

export class HTTPException extends Error {
  readonly res?: Response
  readonly status: StatusCode
  constructor(status: StatusCode = 500, options?: HTTPExceptionOptions) {
    const message = options?.message || getStatusText(status)
    super(message)
    this.res = options?.res
    this.status = status
  }
  getResponse(): Response {
    if (this.res) {
      return this.res
    }
    return new Response(this.message, {
      status: this.status,
      statusText: getStatusText(this.status),
    })
  }
}
