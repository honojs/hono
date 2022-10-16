import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class BadGatewayException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(502), 502)
  }
}
