import { getStatusText } from '../utils/http-status'
import { Exception } from './exception'

export class UnsupportedMediaTypeException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(415), 415)
  }
}
