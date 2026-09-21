import type {
  ClientErrorStatusCode,
  ContentfulStatusCode,
  ServerErrorStatusCode,
} from '../utils/http-status'
import { fetchRP, DetailedError } from './fetch-result-please'
import type { ClientResponse, FilterClientResponseByStatusCode, ObjectType } from './types'

export { DetailedError }

export const mergePath = (base: string, path: string) => {
  base = base.replace(/\/+$/, '')
  base = base + '/'
  path = path.replace(/^\/+/, '')
  return base + path
}

export const replaceUrlParam = (urlString: string, params: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp('/:' + k + '(?:{[^/]+})?\\??(?=/|$)')
    urlString = urlString.replace(reg, () => (v ? `/${v}` : ''))
  }
  return urlString
}

export const buildSearchParams = (query: Record<string, string | string[]>) => {
  const searchParams = new URLSearchParams()

  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) {
      continue
    }

    if (Array.isArray(v)) {
      for (const v2 of v) {
        if (v2 === undefined) {
          continue
        }
        searchParams.append(k, v2)
      }
    } else {
      searchParams.set(k, v)
    }
  }

  return searchParams
}

export const replaceUrlProtocol = (urlString: string, protocol: 'ws' | 'http') => {
  switch (protocol) {
    case 'ws':
      return urlString.replace(/^http/, 'ws')
    case 'http':
      return urlString.replace(/^ws/, 'http')
  }
}

export const removeIndexString = (urlString: string) => {
  if (/^https?:\/\/[^\/]+?\/index(?=\?|$)/.test(urlString)) {
    return urlString.replace(/\/index(?=\?|$)/, '/')
  }
  return urlString.replace(/\/index(?=\?|$)/, '')
}

function isObject(item: unknown): item is ObjectType {
  return typeof item === 'object' && item !== null && !Array.isArray(item)
}

export function deepMerge<T>(target: T, source: Record<string, unknown>): T {
  if (!isObject(target) && !isObject(source)) {
    return source as T
  }
  const merged = { ...target } as ObjectType<T>

  for (const key in source) {
    const value = source[key]
    if (isObject(merged[key]) && isObject(value)) {
      merged[key] = deepMerge(merged[key], value)
    } else {
      merged[key] = value as T[keyof T] & T
    }
  }

  return merged as T
}

/**
 * Shortcut to get a consumable response from `hc`'s fetch calls (Response), with types inference.
 *
 * Smartly parse the response data, throwing a structured error if the response is not `ok`. ({@link DetailedError})
 *
 * @example const result = await parseResponse(client.posts.$get())
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseResponse<T extends ClientResponse<any>>(
  fetchRes: T | Promise<T>
): Promise<ParseResponseData<T, SuccessResponseStatusCode>> {
  return fetchRP(fetchRes)
}

type SuccessResponseStatusCode = Exclude<
  ContentfulStatusCode,
  ClientErrorStatusCode | ServerErrorStatusCode
>
type ErrorResponseStatusCode = ClientErrorStatusCode | ServerErrorStatusCode

type ParseResponseData<T extends ClientResponse<any>, U extends number> =
  FilterClientResponseByStatusCode<T, U> extends never
    ? undefined
    : FilterClientResponseByStatusCode<T, U> extends ClientResponse<infer RT, infer _, infer RF>
      ? RF extends 'json'
        ? RT
        : RT extends string
          ? RT
          : string
      : undefined

type ParseResponseWithErrorResult<T extends ClientResponse<any>> =
  | {
      result: ParseResponseData<T, SuccessResponseStatusCode>
      error: undefined
    }
  | (FilterClientResponseByStatusCode<T, ErrorResponseStatusCode> extends never
      ? never
      : {
          result: undefined
          error: DetailedError<ParseResponseData<T, ErrorResponseStatusCode>>
        })

/**
 * Shortcut to get a consumable response from `hc`'s fetch calls (Response), with types inference.
 *
 * Returns either the parsed successful result or a structured error with the parsed error response
 * data. Fetch errors and response body parsing errors are still thrown.
 *
 * @example const { result, error } = await parseResponseWithError(client.posts.$get())
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseResponseWithError<T extends ClientResponse<any>>(
  fetchRes: T | Promise<T>
): Promise<ParseResponseWithErrorResult<T>> {
  try {
    const result = await parseResponse(fetchRes)
    return { result, error: undefined } as ParseResponseWithErrorResult<T>
  } catch (error) {
    if (error instanceof DetailedError) {
      return {
        result: undefined,
        error: error as ParseResponseWithErrorResult<T> extends { error: infer E } ? E : never,
      } as ParseResponseWithErrorResult<T>
    }
    throw error
  }
}
