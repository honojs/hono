import { replaceUrlParam } from '../../client/utils'
import type { Context } from '../../context'
import { inspectRoutes } from '../../helper/dev'
import type { Hono } from '../../hono'
import type { Env, MiddlewareHandler, Schema } from '../../types'
import { bufferToString } from '../../utils/buffer'
import { createPool } from '../../utils/concurrent'
import { getExtension } from '../../utils/mime'
import { joinPaths, dirname } from './utils'

export const X_HONO_SSG_HEADER_KEY = 'x-hono-ssg'
export const X_HONO_DISABLE_SSG_HEADER_KEY = 'x-hono-disable-ssg'

const DEFAULT_CONCURRENCY = 2 // default concurrency for ssg

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
export const ssgParams: SSGParamsMiddleware = (params) => async (c, next) => {
  ;(c.req.raw as AddedSSGDataRequest).ssgParams = Array.isArray(params) ? params : await params(c)
  await next()
}

export type BeforeRequestHook = (req: Request) => Request | false
export type AfterResponseHook = (res: Response) => Response | false
export type AfterGenerateHook = (result: ToSSGResult) => void | Promise<void>

export interface ToSSGOptions {
  dir?: string
  beforeRequestHook?: BeforeRequestHook
  afterResponseHook?: AfterResponseHook
  afterGenerateHook?: AfterGenerateHook
  concurrency?: number
}

/**
 * @experimental
 * `fetchRoutesContent` is an experimental feature.
 * The API might be changed.
 */
export const fetchRoutesContent = function* <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>,
  beforeRequestHook?: BeforeRequestHook,
  afterResponseHook?: AfterResponseHook,
  concurrency?: number
): Generator<
  Promise<
    | Generator<
        Promise<{ routePath: string; mimeType: string; content: string | ArrayBuffer } | undefined>
      >
    | undefined
  >
> {
  const baseURL = 'http://localhost'
  const pool = createPool({ concurrency })

  for (const route of inspectRoutes(app)) {
    if (route.isMiddleware) {
      continue
    }

    // GET Route Info
    const thisRouteBaseURL = new URL(route.path, baseURL).toString()

    let forGetInfoURLRequest = new Request(thisRouteBaseURL) as AddedSSGDataRequest
    forGetInfoURLRequest.headers.set(X_HONO_SSG_HEADER_KEY, 'true')
    if (beforeRequestHook) {
      const maybeRequest = beforeRequestHook(forGetInfoURLRequest)
      if (!maybeRequest) {
        continue
      }
      forGetInfoURLRequest = maybeRequest as unknown as AddedSSGDataRequest
    }

    // eslint-disable-next-line no-async-promise-executor
    yield new Promise(async (resolveGetInfo, rejectGetInfo) => {
      try {
        await pool.run(() => app.fetch(forGetInfoURLRequest))

        if (!forGetInfoURLRequest.ssgParams) {
          if (isDynamicRoute(route.path)) {
            resolveGetInfo(undefined)
            return
          }
          forGetInfoURLRequest.ssgParams = [{}]
        }

        resolveGetInfo(
          (function* () {
            for (const param of forGetInfoURLRequest.ssgParams as SSGParams) {
              // eslint-disable-next-line no-async-promise-executor
              yield new Promise(async (resolveReq, rejectReq) => {
                try {
                  const replacedUrlParam = replaceUrlParam(route.path, param)
                  let response = await pool.run(() =>
                    app.request(replacedUrlParam, forGetInfoURLRequest)
                  )
                  if (response.headers.get(X_HONO_DISABLE_SSG_HEADER_KEY)) {
                    resolveReq(undefined)
                    return
                  }
                  if (afterResponseHook) {
                    const maybeResponse = afterResponseHook(response)
                    if (!maybeResponse) {
                      resolveReq(undefined)
                      return
                    }
                    response = maybeResponse
                  }
                  const mimeType =
                    response.headers.get('Content-Type')?.split(';')[0] || 'text/plain'
                  const content = await parseResponseContent(response)
                  resolveReq({
                    routePath: replacedUrlParam,
                    mimeType,
                    content,
                  })
                } catch (error) {
                  rejectReq(error)
                }
              })
            }
          })()
        )
      } catch (error) {
        rejectGetInfo(error)
      }
    })
  }
}

const isDynamicRoute = (path: string): boolean => {
  return path.split('/').some((segment) => segment.startsWith(':') || segment.includes('*'))
}

/**
 * @experimental
 * `saveContentToFile` is an experimental feature.
 * The API might be changed.
 */
const createdDirs: Set<string> = new Set()
export const saveContentToFile = async (
  data: Promise<{ routePath: string; content: string | ArrayBuffer; mimeType: string } | undefined>,
  fsModule: FileSystemModule,
  outDir: string
): Promise<string | undefined> => {
  const awaitedData = await data
  if (!awaitedData) {
    return
  }
  const { routePath, content, mimeType } = awaitedData
  const filePath = generateFilePath(routePath, outDir, mimeType)
  const dirPath = dirname(filePath)

  if (!createdDirs.has(dirPath)) {
    await fsModule.mkdir(dirPath, { recursive: true })
    createdDirs.add(dirPath)
  }
  if (typeof content === 'string') {
    await fsModule.writeFile(filePath, content)
  } else if (content instanceof ArrayBuffer) {
    await fsModule.writeFile(filePath, bufferToString(content))
  }
  return filePath
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
  const getInfoPromises: Promise<unknown>[] = []
  const savePromises: Promise<string | undefined>[] = []
  try {
    const outputDir = options?.dir ?? './static'
    const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY

    const getInfoGen = fetchRoutesContent(
      app,
      options?.beforeRequestHook,
      options?.afterResponseHook,
      concurrency
    )
    for (const getInfo of getInfoGen) {
      getInfoPromises.push(
        getInfo.then((getContentGen) => {
          if (!getContentGen) {
            return
          }
          for (const content of getContentGen) {
            savePromises.push(saveContentToFile(content, fs, outputDir))
          }
        })
      )
    }
    await Promise.all(getInfoPromises)
    const files = (await Promise.all(savePromises)).filter(Boolean) as string[]
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
