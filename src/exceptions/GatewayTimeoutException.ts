import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class GatewayTimeoutException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(504), 504)
  }
}
