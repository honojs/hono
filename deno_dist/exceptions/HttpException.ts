import type { StatusCode } from '../utils/http-status.ts'
import { Exception } from './exception.ts'

export class HttpException extends Exception implements Exception {
  constructor(message: string, status: StatusCode) {
    super(message, status)
  }
}
