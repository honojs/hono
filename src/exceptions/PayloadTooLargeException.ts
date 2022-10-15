import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class PayloadTooLargeException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(413), 413)
  }
}
