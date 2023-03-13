import { getPathFromURL } from '../utils/url.ts'
import type { ObjectType } from './types.ts'

export const mergePath = (base: string, path: string) => {
  base = base.replace(/\/+$/, '')
  base = base + '/'
  path = path.replace(/^\/+/, '')
  return base + path
}

export const replaceUrlParam = (urlString: string, params: Record<string, string>) => {
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp('/:' + k)
    urlString = urlString.replace(reg, `/${v}`)
  }
  return urlString
}

export const removeIndexString = (urlSting: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const path = getPathFromURL(urlSting)
  return urlSting.replace(/\/index$/, '/')
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
