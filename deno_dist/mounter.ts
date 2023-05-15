import type { Context } from './context.ts'
import type { MiddlewareHandler } from './types.ts'
import { mergePath } from './utils/url.ts'

interface ApplicationHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (request: Request, ...args: any): Response | Promise<Response>
}
type OptionHandler = (c: Context) => unknown

/**
 * @experimental
 * `mount()` is an experimental feature.
 * The API might be changed.
 */
export const mount = (
  path: string,
  applicationHandler: ApplicationHandler,
  optionHandler?: OptionHandler
): [string, MiddlewareHandler] => {
  path = normalizePath(path)
  const handler: MiddlewareHandler = async (c, next) => {
    let executionContext: ExecutionContext | undefined = undefined
    try {
      executionContext = c.executionCtx
    } catch {} // Do nothing
    // Default options are "Env" and "ExecutionContext"
    const options = optionHandler ? optionHandler(c) : [c.env, executionContext]
    const optionsArray = Array.isArray(options) ? options : [options]

    const res = await applicationHandler(
      new Request(getNewRequestURL(c.req.url, path), c.req.raw),
      ...optionsArray
    )

    if (res) return res

    await next()
  }
  return [mergePath(path, '*'), handler]
}

export const getBaseURLAndPath = (url: string) => {
  const match = url.match(/(^https?:\/\/[^\/]+)\/(.+)?/)
  const baseURL = match ? match[1] : url
  const path = match && match[2] ? `/${match[2]}` : '/'
  return [baseURL, path]
}

export const normalizePath = (path: string) => {
  return path.replace(/\/\*$/, '') || '/' // Normalize for `/abc/*`
}

export const getNewRequestURL = (urlString: string, path: string) => {
  const [baseURL, oldPath] = getBaseURLAndPath(urlString)
  const regexp = new RegExp(`^${path}`)
  path = oldPath.replace(regexp, '')
  if (!/^\//.test(path)) path = '/' + path
  return baseURL + normalizePath(path)
}
