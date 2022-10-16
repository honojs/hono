import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class ConflictException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(409), 409)
  }
}
