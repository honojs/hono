import { fetchRP, DetailedError } from 'fetch-result-please'
import type { ClientResponse, ObjectType } from './types'

export { DetailedError }

export const mergePath = (base: string, path: string) => {
  base = base.replace(/\/+$/, '')
  base = base + '/'
  path = path.replace(/^\/+/, '')
  return base + path
}

export const replaceUrlParam = (urlString: string, params: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp('/:' + k + '(?:{[^/]+})?\\??')
    urlString = urlString.replace(reg, v ? `/${v}` : '')
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

export const removeIndexString = (urlSting: string) => {
  if (/^https?:\/\/[^\/]+?\/index$/.test(urlSting)) {
    return urlSting.replace(/\/index$/, '/')
  }
  return urlSting.replace(/\/index$/, '')
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
 * Shortcut to get a consumable response from `hc` fetch calls, with types inference.
 *
 * Smartly parse the response data, and automatically throw an error if the response is not ok.
 *
 * To handle an error, see {@link DetailedError} interface.
 *
 * @example hcParse(client.posts.$get())
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hcParse<T extends ClientResponse<any>>(
  fetchRes: T | Promise<T>
): Promise<T extends ClientResponse<infer RT> ? RT : never> {
  return fetchRP(fetchRes)
}
