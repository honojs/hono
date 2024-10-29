import { replaceUrlParam } from '../../client/utils'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import { createPool } from '../../utils/concurrent'
import { getExtension } from '../../utils/mime'
import type { AddedSSGDataRequest, SSGParams } from './middleware'
import { SSG_CONTEXT, X_HONO_DISABLE_SSG_HEADER_KEY } from './middleware'
import { dirname, filterStaticGenerateRoutes, joinPaths } from './utils'

const DEFAULT_CONCURRENCY = 2 // default concurrency for ssg

// 'default_content_type' is designed according to Bun's performance optimization,
//  which omits Content-Type by default for text responses.
//  This is based on benchmarks showing performance gains without Content-Type.
//  In Hono, using `c.text()` without a Content-Type implicitly assumes 'text/plain; charset=UTF-8'.
//  This approach maintains performance consistency across different environments.
//  For details, see GitHub issues: oven-sh/bun#8530 and https://github.com/honojs/hono/issues/2284.
const DEFAULT_CONTENT_TYPE = 'text/plain'

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

const generateFilePath = (
  routePath: string,
  outDir: string,
  mimeType: string,
  extensionMap?: Record<string, string>
): string => {
  const extension = determineExtension(mimeType, extensionMap)

  if (routePath.endsWith(`.${extension}`)) {
    return joinPaths(outDir, routePath)
  }

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

export const defaultExtensionMap: Record<string, string> = {
  'text/html': 'html',
  'text/xml': 'xml',
  'application/xml': 'xml',
  'application/yaml': 'yaml',
}

const determineExtension = (
  mimeType: string,
  userExtensionMap?: Record<string, string>
): string => {
  const extensionMap = userExtensionMap || defaultExtensionMap
  if (mimeType in extensionMap) {
    return extensionMap[mimeType]
  }
  return getExtension(mimeType) || 'html'
}

export type BeforeRequestHook = (req: Request) => Request | false | Promise<Request | false>
export type AfterResponseHook = (res: Response) => Response | false | Promise<Response | false>
export type AfterGenerateHook = (result: ToSSGResult) => void | Promise<void>

export const combineBeforeRequestHooks = (
  hooks: BeforeRequestHook | BeforeRequestHook[]
): BeforeRequestHook => {
  if (!Array.isArray(hooks)) {
    return hooks
  }
  return async (req: Request): Promise<Request | false> => {
    let currentReq = req
    for (const hook of hooks) {
      const result = await hook(currentReq)
      if (result === false) {
        return false
      }
      if (result instanceof Request) {
        currentReq = result
      }
    }
    return currentReq
  }
}

export const combineAfterResponseHooks = (
  hooks: AfterResponseHook | AfterResponseHook[]
): AfterResponseHook => {
  if (!Array.isArray(hooks)) {
    return hooks
  }
  return async (res: Response): Promise<Response | false> => {
    let currentRes = res
    for (const hook of hooks) {
      const result = await hook(currentRes)
      if (result === false) {
        return false
      }
      if (result instanceof Response) {
        currentRes = result
      }
    }
    return currentRes
  }
}

export const combineAfterGenerateHooks = (
  hooks: AfterGenerateHook | AfterGenerateHook[]
): AfterGenerateHook => {
  if (!Array.isArray(hooks)) {
    return hooks
  }
  return async (result: ToSSGResult): Promise<void> => {
    for (const hook of hooks) {
      await hook(result)
    }
  }
}

export interface ToSSGOptions {
  dir?: string
  beforeRequestHook?: BeforeRequestHook | BeforeRequestHook[]
  afterResponseHook?: AfterResponseHook | AfterResponseHook[]
  afterGenerateHook?: AfterGenerateHook | AfterGenerateHook[]
  concurrency?: number
  extensionMap?: Record<string, string>
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

  for (const route of filterStaticGenerateRoutes(app)) {
    // GET Route Info
    const thisRouteBaseURL = new URL(route.path, baseURL).toString()

    let forGetInfoURLRequest = new Request(thisRouteBaseURL) as AddedSSGDataRequest

    // eslint-disable-next-line no-async-promise-executor
    yield new Promise(async (resolveGetInfo, rejectGetInfo) => {
      try {
        if (beforeRequestHook) {
          const maybeRequest = await beforeRequestHook(forGetInfoURLRequest)
          if (!maybeRequest) {
            resolveGetInfo(undefined)
            return
          }
          forGetInfoURLRequest = maybeRequest as unknown as AddedSSGDataRequest
        }

        await pool.run(() => app.fetch(forGetInfoURLRequest))

        if (!forGetInfoURLRequest.ssgParams) {
          if (isDynamicRoute(route.path)) {
            resolveGetInfo(undefined)
            return
          }
          forGetInfoURLRequest.ssgParams = [{}]
        }

        const requestInit = {
          method: forGetInfoURLRequest.method,
          headers: forGetInfoURLRequest.headers,
        }

        resolveGetInfo(
          (function* () {
            for (const param of forGetInfoURLRequest.ssgParams as SSGParams) {
              // eslint-disable-next-line no-async-promise-executor
              yield new Promise(async (resolveReq, rejectReq) => {
                try {
                  const replacedUrlParam = replaceUrlParam(route.path, param)
                  let response = await pool.run(() =>
                    app.request(replacedUrlParam, requestInit, {
                      [SSG_CONTEXT]: true,
                    })
                  )
                  if (response.headers.get(X_HONO_DISABLE_SSG_HEADER_KEY)) {
                    resolveReq(undefined)
                    return
                  }
                  if (afterResponseHook) {
                    const maybeResponse = await afterResponseHook(response)
                    if (!maybeResponse) {
                      resolveReq(undefined)
                      return
                    }
                    response = maybeResponse
                  }
                  const mimeType =
                    response.headers.get('Content-Type')?.split(';')[0] || DEFAULT_CONTENT_TYPE
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
  outDir: string,
  extensionMap?: Record<string, string>
): Promise<string | undefined> => {
  const awaitedData = await data
  if (!awaitedData) {
    return
  }
  const { routePath, content, mimeType } = awaitedData
  const filePath = generateFilePath(routePath, outDir, mimeType, extensionMap)
  const dirPath = dirname(filePath)

  if (!createdDirs.has(dirPath)) {
    await fsModule.mkdir(dirPath, { recursive: true })
    createdDirs.add(dirPath)
  }
  if (typeof content === 'string') {
    await fsModule.writeFile(filePath, content)
  } else if (content instanceof ArrayBuffer) {
    await fsModule.writeFile(filePath, new Uint8Array(content))
  }
  return filePath
}

/**
 * @experimental
 * `ToSSGInterface` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGInterface {
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app: Hono<any, any, any>,
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
  let result: ToSSGResult | undefined
  const getInfoPromises: Promise<unknown>[] = []
  const savePromises: Promise<string | undefined>[] = []
  try {
    const outputDir = options?.dir ?? './static'
    const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY

    const combinedBeforeRequestHook = combineBeforeRequestHooks(
      options?.beforeRequestHook || ((req) => req)
    )
    const combinedAfterResponseHook = combineAfterResponseHooks(
      options?.afterResponseHook || ((req) => req)
    )
    const getInfoGen = fetchRoutesContent(
      app,
      combinedBeforeRequestHook,
      combinedAfterResponseHook,
      concurrency
    )
    for (const getInfo of getInfoGen) {
      getInfoPromises.push(
        getInfo.then((getContentGen) => {
          if (!getContentGen) {
            return
          }
          for (const content of getContentGen) {
            savePromises.push(saveContentToFile(content, fs, outputDir).catch((e) => e))
          }
        })
      )
    }
    await Promise.all(getInfoPromises)
    const files: string[] = []
    for (const savePromise of savePromises) {
      const fileOrError = await savePromise
      if (typeof fileOrError === 'string') {
        files.push(fileOrError)
      } else if (fileOrError) {
        throw fileOrError
      }
    }
    result = { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    result = { success: false, files: [], error: errorObj }
  }
  if (options?.afterGenerateHook) {
    const combinedAfterGenerateHooks = combineAfterGenerateHooks(options?.afterGenerateHook)
    await combinedAfterGenerateHooks(result)
  }
  return result
}
