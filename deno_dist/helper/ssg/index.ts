import { replaceUrlParam } from '../../client/utils.ts'
import { Context } from '../../context.ts'
import { inspectRoutes } from '../../helper/dev/index.ts'
import type { Hono } from '../../hono.ts'
import { HonoRequest } from '../../request.ts'
import type { Env, MiddlewareHandler, Schema } from '../../types.ts'
import { bufferToString } from '../../utils/buffer.ts'
import { getExtension } from '../../utils/mime.ts'
import { joinPaths, dirname } from './utils.ts'

export const X_HONO_SSG_HEADER_KEY = 'x-hono-ssg'
export const X_HONO_DISABLE_SSG_HEADER_KEY = 'x-hono-disable-ssg'

const IS_SSG_PARAMS_MIDDLEWARE = Symbol('isSsgParamsMiddleware')

/**
 * @experimental
 * `FileSystemModule` is an experimental feature.
 * The API might be changed.
 */
export interface FileSystemModule {
  writeFile(path: string, data: string | Uint8Array): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

/**
 * @experimental
 * `ToSSGResult` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGResult {
  success: boolean
  files: string[]
  error?: Error
}

const generateFilePath = (routePath: string, outDir: string, mimeType: string) => {
  const extension = determineExtension(mimeType)
  if (routePath === '/') {
    return joinPaths(outDir, `index.${extension}`)
  }
  if (routePath.endsWith('/')) {
    return joinPaths(outDir, routePath, `index.${extension}`)
  }
  return joinPaths(outDir, `${routePath}.${extension}`)
}

const parseResponseContent = async (response: Response): Promise<string | ArrayBuffer> => {
  const contentType = response.headers.get('Content-Type')

  try {
    if (contentType?.includes('text') || contentType?.includes('json')) {
      return await response.text()
    } else {
      return await response.arrayBuffer()
    }
  } catch (error) {
    throw new Error(
      `Error processing response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

const determineExtension = (mimeType: string): string => {
  switch (mimeType) {
    case 'text/html':
      return 'html'
    case 'text/xml':
    case 'application/xml':
      return 'xml'
    default: {
      return getExtension(mimeType) || 'html'
    }
  }
}

interface SSGParam {
  [key: string]: string
}
type SSGParams = SSGParam[]

interface SSGParamsMiddleware {
  <E extends Env = Env>(
    generateParams: (c: Context<E>) => SSGParams | Promise<SSGParams>
  ): MiddlewareHandler<E>
  <E extends Env = Env>(params: SSGParams): MiddlewareHandler<E>
}

type AddedSSGDataRequest = Request & {
  ssgParams?: SSGParams
}
/**
 * Define SSG Route
 */
export const ssgParams: SSGParamsMiddleware = (params) => {
  const handler = async (c: Context, next: Function | undefined) => {
    if (next) {
      // normal request
      return await next()
    } else {
      // to get ssg params
      return Array.isArray(params) ? params : params(c)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(handler as any)[IS_SSG_PARAMS_MIDDLEWARE] = true
  return handler as unknown as MiddlewareHandler
}

export type BeforeRequestHook = (req: Request) => Request | false
export type AfterResponseHook = (res: Response) => Response | false
export type AfterGenerateHook = (result: ToSSGResult) => void | Promise<void>

export interface ToSSGOptions {
  dir?: string
  beforeRequestHook?: BeforeRequestHook
  afterResponseHook?: AfterResponseHook
  afterGenerateHook?: AfterGenerateHook
}

/**
 * @experimental
 * `fetchRoutesContent` is an experimental feature.
 * The API might be changed.
 */
export const fetchRoutesContent = async <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>,
  beforeRequestHook?: BeforeRequestHook,
  afterResponseHook?: AfterResponseHook
): Promise<Map<string, { content: string | ArrayBuffer; mimeType: string }>> => {
  const htmlMap = new Map<string, { content: string | ArrayBuffer; mimeType: string }>()
  const baseURL = 'http://localhost'

  for (const { isMiddleware, path } of inspectRoutes(app)) {
    if (isMiddleware) {
      continue
    }

    // GET Route Info
    const thisRouteBaseURL = new URL(path, baseURL).toString()

    let forGetInfoURLRequest = new Request(thisRouteBaseURL) as AddedSSGDataRequest
    forGetInfoURLRequest.headers.set(X_HONO_SSG_HEADER_KEY, 'true')
    if (beforeRequestHook) {
      const maybeRequest = beforeRequestHook(forGetInfoURLRequest)
      if (!maybeRequest) {
        continue
      }
      forGetInfoURLRequest = maybeRequest as unknown as AddedSSGDataRequest
    }

    let ssgParams
    const ssgParamsMiddleware = app.routes.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ path: p, handler }) => p === path && (handler as any)[IS_SSG_PARAMS_MIDDLEWARE]
    )?.handler
    if (ssgParamsMiddleware) {
      ssgParams = await (ssgParamsMiddleware as Function)(
        new Context(new HonoRequest(forGetInfoURLRequest, path))
      )
    } else {
      if (isDynamicRoute(path)) {
        continue
      }
      ssgParams = [{}]
    }

    for (const param of ssgParams) {
      const replacedUrlParam = replaceUrlParam(path, param)
      let response = await app.request(replacedUrlParam, forGetInfoURLRequest)
      if (response.headers.get(X_HONO_DISABLE_SSG_HEADER_KEY)) {
        continue
      }
      if (afterResponseHook) {
        const maybeResponse = afterResponseHook(response)
        if (!maybeResponse) {
          continue
        }
        response = maybeResponse
      }
      const mimeType = response.headers.get('Content-Type')?.split(';')[0] || 'text/plain'
      const content = await parseResponseContent(response)
      htmlMap.set(replacedUrlParam, {
        mimeType,
        content,
      })
    }
  }

  return htmlMap
}

const isDynamicRoute = (path: string): boolean => {
  return path.split('/').some((segment) => segment.startsWith(':') || segment.includes('*'))
}

/**
 * @experimental
 * `saveContentToFiles` is an experimental feature.
 * The API might be changed.
 */
export const saveContentToFiles = async (
  htmlMap: Map<string, { content: string | ArrayBuffer; mimeType: string }>,
  fsModule: FileSystemModule,
  outDir: string
): Promise<string[]> => {
  const files: string[] = []

  for (const [routePath, { content, mimeType }] of htmlMap) {
    const filePath = generateFilePath(routePath, outDir, mimeType)
    const dirPath = dirname(filePath)

    await fsModule.mkdir(dirPath, { recursive: true })
    if (typeof content === 'string') {
      await fsModule.writeFile(filePath, content)
    } else if (content instanceof ArrayBuffer) {
      await fsModule.writeFile(filePath, bufferToString(content))
    }
    files.push(filePath)
  }

  return files
}

/**
 * @experimental
 * `ToSSGInterface` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  (
    app: Hono<E, S, BasePath>,
    fsModule: FileSystemModule,
    options?: ToSSGOptions
  ): Promise<ToSSGResult>
}

/**
 * @experimental
 * `ToSSGAdaptorInterface` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGAdaptorInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  (app: Hono<E, S, BasePath>, options?: ToSSGOptions): Promise<ToSSGResult>
}

/**
 * @experimental
 * `toSSG` is an experimental feature.
 * The API might be changed.
 */
export const toSSG: ToSSGInterface = async (app, fs, options) => {
  let result: ToSSGResult | undefined = undefined
  try {
    const outputDir = options?.dir ?? './static'
    const maps = await fetchRoutesContent(
      app,
      options?.beforeRequestHook,
      options?.afterResponseHook
    )
    const files = await saveContentToFiles(maps, fs, outputDir)
    result = { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    result = { success: false, files: [], error: errorObj }
  }
  await options?.afterGenerateHook?.(result)
  return result
}

/**
 * @experimental
 * `disableSSG` is an experimental feature.
 * The API might be changed.
 */

export const disableSSG = (): MiddlewareHandler =>
  async function disableSSG(c, next) {
    await next()
    c.header(X_HONO_DISABLE_SSG_HEADER_KEY, 'true')
  }

/**
 * @experimental
 * `onlySSG` is an experimental feature.
 * The API might be changed.
 */
export const onlySSG = (): MiddlewareHandler =>
  async function onlySSG(c, next) {
    const headerValue = c.req.raw.headers.get(X_HONO_SSG_HEADER_KEY)
    if (headerValue) {
      await next()
    }
    return c.notFound()
  }
