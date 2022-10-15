import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class GoneException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(410), 410)
  }
}
