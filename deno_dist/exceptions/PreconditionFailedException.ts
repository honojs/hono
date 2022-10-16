import { getStatusText } from '../utils/http-status.ts'
import { Exception } from './exception.ts'

export class PreconditionFailedException extends Exception implements Exception {
  constructor(message?: string) {
    super(message || getStatusText(412), 412)
  }
}
