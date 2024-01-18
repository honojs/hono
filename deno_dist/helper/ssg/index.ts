import { Buffer } from "node:buffer";
import { replaceUrlParam } from '../../client/utils.ts'
import type { Context } from '../../context.ts'
import { inspectRoutes } from '../../helper/dev/index.ts'
import type { Hono } from '../../hono.ts'
import type { Env, MiddlewareHandler, Schema } from '../../types.ts'
import { getExtension } from '../../utils/mime.ts'
import { joinPaths, dirname } from './utils.ts'

/**
 * @experimental
 * `FileSystemModule` is an experimental feature.
 * The API might be changed.
 */
export interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

/**
 * @experimental
 * `ToSSGResult` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGResult {
  success: boolean
  files?: string[]
  error?: Error
}

const generateFilePath = (routePath: string, outDir: string, mimeType: string) => {
  const extension = determineExtension(mimeType)
  const fileName = routePath === '/' ? `index${extension}` : `${routePath}${extension}`
  return joinPaths(outDir, fileName)
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
      return '.html'
    case 'text/xml':
    case 'application/xml':
      return '.xml'
    default: {
      const extension = getExtension(mimeType)
      return extension || '.html'
    }
  }
}

interface SSGParam {
  [key: string]: string
}
type SSGParams = SSGParam[]
interface SSGParamsMiddleware {
  (generateParams: (c: Context) => SSGParams | Promise<SSGParams>): MiddlewareHandler
}
type AddedSSGDataRequest = Request & {
  ssgParams?: SSGParams
}
/**
 * Define SSG Route
 */
export const ssgParams: SSGParamsMiddleware = (generateParams) => async (c, next) => {
  ;(c.req.raw as AddedSSGDataRequest).ssgParams = await generateParams(c)
  await next()
}

export interface ToSSGOptions {
  /** The directory to save the generated files. */
  dir?: string
  /** Whether to fetch each route in parallel. */
  parallel?: boolean
  /** The interval between requests. (enabled only when `parallel` is `false`) */
  interval?: number
}

export interface FetchRoutesContentOptions {
  /** Whether to fetch each route in parallel. */
  parallel: boolean
  /** The interval between requests. (enabled only when `parallel` is `false`) */
  interval: number
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
  options: Partial<FetchRoutesContentOptions> = {
    parallel: true,
    interval: 0,
  }
): Promise<Map<string, { content: string | ArrayBuffer; mimeType: string }>> => {
  const htmlMap = new Map<string, { content: string | ArrayBuffer; mimeType: string }>()
  const baseURL = 'http://localhost'

  for (const route of inspectRoutes(app)) {
    if (route.isMiddleware) continue

    // GET Route Info
    const thisRouteBaseURL = new URL(route.path, baseURL).toString()
    const forGetInfoURLRequest = new Request(thisRouteBaseURL) as AddedSSGDataRequest
    await app.fetch(forGetInfoURLRequest)

    if (!forGetInfoURLRequest.ssgParams) {
      if (isDynamicRoute(route.path)) continue
      forGetInfoURLRequest.ssgParams = [{}]
    }

    const execDynamicRequest = async (param: SSGParam) => {
      const replacedUrlParam = replaceUrlParam(route.path, param)
      const response = await app.request(replacedUrlParam)
      const mimeType = response.headers.get('Content-Type')?.split(';')[0] || 'text/plain'
      const content = await parseResponseContent(response)
      htmlMap.set(replacedUrlParam, {
        mimeType,
        content,
      })
    }

    if (options.parallel) {
      await Promise.all(forGetInfoURLRequest.ssgParams.map(execDynamicRequest))
    } else {
      for (const param of forGetInfoURLRequest.ssgParams) {
        await execDynamicRequest(param)
        await new Promise((resolve) => setTimeout(resolve, options.interval))
      }
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
      await fsModule.writeFile(filePath, Buffer.from(content))
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
  (app: Hono<E, S, BasePath>, options?: { dir?: string }): Promise<ToSSGResult>
}

/**
 * @experimental
 * `toSSG` is an experimental feature.
 * The API might be changed.
 */
export const toSSG: ToSSGInterface = async (app, fs, options) => {
  try {
    const maps = await fetchRoutesContent(app, options)
    const files = await saveContentToFiles(maps, fs, options?.dir ?? './static')
    return { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return { success: false, error: errorObj }
  }
}
