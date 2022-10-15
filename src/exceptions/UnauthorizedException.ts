import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class UnauthorizedException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(401), 401)
  }
}
