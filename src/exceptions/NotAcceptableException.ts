import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class NotAcceptableException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(406), 406)
  }
}
