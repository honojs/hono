import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class ForbiddenException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(403), 403)
  }
}
