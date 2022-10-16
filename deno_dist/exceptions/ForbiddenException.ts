import { getStatusText } from '../utils/http-status.ts'
import { Exception } from './exception.ts'

export class ForbiddenException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(403), 403)
  }
}
