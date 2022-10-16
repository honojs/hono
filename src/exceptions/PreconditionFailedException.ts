import { getStatusText } from '../utils/http-status'
import { Exception } from './Exception'

export class PreconditionFailedException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(412), 412)
  }
}
