import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class RequestTimeoutException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(408), 408)
  }
}
