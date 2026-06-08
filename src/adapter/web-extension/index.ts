import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import { handle } from './handler'
import type { RequestFilter } from './types'

export type FireOptions = {
  filter?: RequestFilter
  extraInfoSpec?: string[]
}

const fire = <E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  options?: FireOptions
): void => {
  const filter = options?.filter ?? { urls: ['<all_urls>'] }
  const extraInfoSpec = options?.extraInfoSpec ?? ['blocking']
  // @ts-expect-error chrome is available in WebExtension service workers
  chrome.webRequest.onBeforeRequest.addListener(handle(app), filter, extraInfoSpec)
}

export { handle, fire }
