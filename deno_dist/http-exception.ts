import type { StatusCode } from './utils/http-status.ts'

type HTTPExceptionOptions = {
  res?: Response
  message?: string
}

export class HTTPException extends Error {
  readonly res?: Response
  readonly status: StatusCode
  constructor(status: StatusCode = 500, options?: HTTPExceptionOptions) {
    super(options?.message)
    this.res = options?.res
    this.status = status
  }
  getResponse(): Response {
    if (this.res) {
      return this.res
    }
    return new Response(this.message, {
      status: this.status,
    })
  }
}
