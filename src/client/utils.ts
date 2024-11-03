import type { InferResponseType, ObjectType } from './types'

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
 * Generate a TanStack Query key from a Hono client function
 *
 * @example
 * getQueryKey(() => api.dashboard.deployments.user[':userId'].$get({ param: { userId } }), [userId])
 * Returns:
 * [
 *   "dashboard.deployments.user[\":userId\"].$get({ param: { userId } })",
 *   "6h8s62e7uppe4ee"
 * ]
 *
 * @param fn - function that returns the Hono client function: () => api.$get()
 * @param keyComplement - Additional key elements
 * @returns Array containing a query key string based on the hono client function name, and additional elements passed by the user.
 */
export function getQueryKey<T extends () => unknown>(
  fn: T,
  keyComplement: unknown[] = [undefined]
) {
  const queryKeyString = fn.toString().split('.').slice(1).join('.')
  return [queryKeyString, ...keyComplement].filter(Boolean)
}

/**
 * Generate a TanStack Query function from a Hono client function
 *
 * @example
 * getQueryFn(()=> api.dashboard.deployments.user[':userId'].$get({ param: { userId } }))
 * Returns:
 * async (): Promise<ResType> => {
 *   const res = await api.dashboard.deployments.user[':userId'].$get({ param: { userId } };
 *   if (!res.ok) {
 *     throw new Error("server error");
 *   }
 *   const data = await res.json();
 *   return data;
 * }
 *
 * @param fn - function that returns the Hono client function: () => api.$get()
 * @returns Async function that handles the API call and response
 */
export function getQueryFn<T extends () => unknown>(fn: T) {
  type ResType = InferResponseType<T>

  return async (): Promise<ResType> => {
    const res = (await fn()) as Response
    if (!res.ok) {
      throw new Error('server error')
    }
    const data = await res.json()
    return data
  }
}

/**
 * Generate TanStack Query options from a Hono client function
 *
 * @example
 * getQueryOptions(() => api.dashboard.deployments.user[':userId'].$get({ param: { userId } }), [userId])
 * Returns:
 * {
 *   queryKey: [
 *     "dashboard.deployments.user[\":userId\"].$get({ param: { userId } })",
 *     "6h8s62e7uppe4ee"
 *   ],
 *   queryFn: async (): Promise<ResType> => {
 *     const res = await api.dashboard.deployments.user[':userId'].$get({ param: { userId } };
 *     if (!res.ok) {
 *       throw new Error("server error");
 *     }
 *     const data = await res.json();
 *     return data;
 *   }
 * }
 *
 * @param fn - Hono client function
 * @param keyComplement - Additional key elements
 * @returns Object containing queryKey and queryFn
 */
export function getQueryOptions<T extends () => unknown>(
  fn: T,
  keyComplement: unknown[] = [undefined]
) {
  return {
    queryKey: getQueryKey(fn, keyComplement),
    queryFn: getQueryFn(fn),
  }
}
