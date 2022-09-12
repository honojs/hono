export const METHOD_NAME_ALL = 'ALL' as const
export const METHOD_NAME_ALL_LOWERCASE = 'all' as const
export const METHODS = ['get', 'post', 'put', 'delete', 'head', 'options', 'patch'] as const

export interface Router<T> {
  add(method: string, path: string, handler: T): void
  match(method: string, path: string): Result<T> | null
}

export interface Result<T> {
  handlers: T[]
  params: Record<string, string>
}

export class UnsupportedPathError extends Error {}
