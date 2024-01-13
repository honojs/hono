import * as path from 'path'
import { inspectRoutes } from '../../helper/dev'
import type { Hono } from '../../hono'
import type { Env, MiddlewareHandler, Schema } from '../../types'
import { replaceUrlParam } from '../../client/utils'

export interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

export interface ToSSGResult {
  success: boolean
  files?: string[]
  error?: Error
}

const generateFilePath = (routePath: string, outDir: string) => {
  const fileName = routePath === '/' ? 'index.html' : routePath + '.html'
  return path.join(outDir, fileName)
}

interface SSGParam {
  [key: string]: string
}
type SSGParams = SSGParam[]
interface SSGParamsMiddleware {
  (generateParams: () => (SSGParams | Promise<SSGParams>)): MiddlewareHandler
  (isSSG: boolean): MiddlewareHandler
}
type AddedSSGDataRequest = Request & {
  ssgData?: {
    ssg: true
    params: SSGParams
  } | {
    ssg: false
  }
}
/**
 * Define SSG Route
 */
export const ssgParams: SSGParamsMiddleware = (
  init
) => async (c, next) => {
  (c.req.raw as AddedSSGDataRequest).ssgData = await (async () => {
    if (init === false) {
      // Don't SSG
      return {
        ssg: false
      }
    } else if (init === true) {
      // Will SSG
      return {
        ssg: true,
        params: [{}]
      }
    } else {
      const params = await init()
      return {
        ssg: true,
        params,
      }
    }
  })()
  await next()
}

export const generateHtmlMap = async <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>,
  options: ToSSGOptions
): Promise<Map<string, string>> => {
  const htmlMap = new Map<string, string>()

  for (const route of inspectRoutes(app)) {
    if (route.isMiddleware) continue

    // GET Route Info
    const baseURL = 'http://localhost'
    const thisRouteBaseURL = new URL(route.path, baseURL).toString()
    const forGetInfoURLRequest = new Request(thisRouteBaseURL) as AddedSSGDataRequest
    await app.fetch(forGetInfoURLRequest)
    if (!forGetInfoURLRequest.ssgData) {
      forGetInfoURLRequest.ssgData = options.default === 'ssr' ? {
        ssg: false,
      } : {
        ssg: true,
        params: [{}]
      }
    }

    if (!forGetInfoURLRequest.ssgData.ssg) {
      continue // Don't SSG
    }

    for (const param of forGetInfoURLRequest.ssgData.params) {
      const replacedUrlParam = replaceUrlParam(route.path, param)
      const response = await app.request(replacedUrlParam)
      htmlMap.set(replacedUrlParam, await response.text())
    }
  }

  return htmlMap
}

export const saveHtmlToLocal = async (
  htmlMap: Map<string, string>,
  fsModule: FileSystemModule,
  outDir: string
): Promise<string[]> => {
  const files: string[] = []

  for (const [routePath, html] of htmlMap) {
    const filePath = generateFilePath(routePath, outDir)
    const dirPath = path.dirname(filePath)

    await fsModule.mkdir(dirPath, { recursive: true })
    await fsModule.writeFile(filePath, html)
    files.push(filePath)
  }

  return files
}

export interface ToSSGOptions {
  dir?: string
  default?: 'ssg' | 'ssr'
}
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

export interface ToSSGAdaptorInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  (app: Hono<E, S, BasePath>, options?: { dir?: string }): Promise<ToSSGResult>
}

export const toSSG: ToSSGInterface = async (app, fs, options) => {
  try {
    const outputDir = options?.dir ?? './static'
    const maps = await generateHtmlMap(app, options ?? {})
    const files = await saveHtmlToLocal(maps, fs, outputDir)
    return { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return { success: false, error: errorObj }
  }
}
