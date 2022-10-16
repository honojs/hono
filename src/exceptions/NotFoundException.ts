import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class NotFoundException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(404), 404)
  }
}
