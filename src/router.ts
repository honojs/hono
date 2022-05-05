export const METHOD_NAME_ALL = 'ALL' as const
export const METHOD_NAME_ALL_LOWERCASE = 'all' as const

export abstract class Router<T> {
  abstract add(method: string, path: string, handler: T): void
  abstract match(method: string, path: string): Result<T> | null
}

export class Result<T> {
  handlers: T[]
  params: Record<string, string>
  constructor(handlers: T[], params: Record<string, string>) {
    this.handlers = handlers
    this.params = params
  }
}
