import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class HttpVersionNotSupportedException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(505), 505)
  }
}
