import type { StatusCode } from '../utils/http-status'
import { getStatusText } from '../utils/http-status'

export class Exception extends Error {
  public readonly status: StatusCode

  constructor(message?: string, status: StatusCode = 500) {
    super(message || getStatusText(status))
    this.status = status
  }
}
