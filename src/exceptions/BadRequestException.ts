import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class BadRequestException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(400), 400)
  }
}
