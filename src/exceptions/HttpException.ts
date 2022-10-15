import type { StatusCode } from '../utils/http-status'
import { Exception } from './exception'

export class HttpException extends Exception implements Exception {
  constructor(message: string, status: StatusCode) {
    super(message, status)
  }
}
