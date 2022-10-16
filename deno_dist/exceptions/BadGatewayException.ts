import { getStatusText } from '../utils/http-status.ts'
import { Exception } from './exception.ts'

export class BadGatewayException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(502), 502)
  }
}
