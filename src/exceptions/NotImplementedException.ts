import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class NotImplementedException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(501), 501)
  }
}
