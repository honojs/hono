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

/*
  generate a tanstack query key from a hono client function:
  call: get_query_key(() => api.dashboard.deployments.user[':userId'].$get({ param: { userId } }), [userId]) 
  returns: [
    "dashboard.deployments.user[\":userId\"].$get({ param: { userId } })",
    "9h8s62e7uppe4ee"
  ]
*/
export function getQueryKey<T extends () => any>(
  fn: T,
  keyComplement: any[] = [undefined]
) {
  const queryKeyString = fn.toString().split(".").slice(1).join(".");
  return [queryKeyString, ...keyComplement];
};

/*
  generate a tanstack query function from a hono client function:
  call: getQueryFn(()=> api.dashboard.deployments.user[':userId'].$get({ param: { userId } }))
  returns: 
   return async (): Promise<ResType> => {
    const res = await api.dashboard.deployments.user[':userId'].$get({ param: { userId } };
    if (!res.ok) {
      throw new Error("server error");
    }
    const data = await res.json();
    return data;
  };
*/
export function getQueryFn<T extends () => any>(fn: T) {
  type ResType = InferResponseType<T>;

  return async (): Promise<ResType> => {
    const res = await fn();
    if (!res.ok) {
      throw new Error("server error");
    }
    const data = await res.json();
    return data;
  };
}

/*
  generate tanstack query options from a hono client function:
  call: getQueryOptions(() => api.dashboard.deployments.user[':userId'].$get({ param: { userId } }), [userId]) 
  returns: 
  { 
    queryKey: [
      "dashboard.deployments.user[\":userId\"].$get({ param: { userId } })",
      "0h2s23e0uppe1ee"
    ],
    queryFn: async (): Promise<ResType> => {
    const res = await api.dashboard.deployments.user[':userId'].$get({ param: { userId } };
    if (!res.ok) {
      throw new Error("server error");
    }
    const data = await res.json();
    return data;
  }
*/
export function getQueryOptions<T extends () => any>(
  fn: T,
  keyComplement: any[] = [undefined]
) {
  return {
    queryKey: getQueryKey(fn, keyComplement),
    queryFn: getQueryFn(fn),
  };
}