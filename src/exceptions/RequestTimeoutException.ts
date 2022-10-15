import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class RequestTimeoutException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(408), 408)
  }
}
