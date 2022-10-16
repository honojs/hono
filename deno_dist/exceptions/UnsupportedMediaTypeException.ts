import { getStatusText } from '../utils/http-status.ts'
import { Exception } from './exception.ts'

export class UnsupportedMediaTypeException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(415), 415)
  }
}
