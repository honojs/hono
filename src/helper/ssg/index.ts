import * as path from 'path'
import { inspectRoutes } from '../../helper/dev'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

export interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

export interface ToSSGResult {
  success: boolean
  files?: string[]
  error?: Error
}

const generateFilePath = (routePath: string, outDir: string, mimeType: string) => {
  const extension = determineExtension(mimeType)
  const fileName = routePath === '/' ? `index${extension}` : `${routePath}${extension}`
  return path.join(outDir, fileName)
}

const parseResponseContent = async (response: Response): Promise<string | ArrayBuffer> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const contentType = response.headers.get('Content-Type')

  try {
    if (contentType?.includes('text')) {
      return await response.text()
    } else if (contentType?.includes('json')) {
      return JSON.stringify(await response.json())
    } else {
      return await response.arrayBuffer()
    }
  } catch (error) {
    throw new Error(
      `Error processing response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

function determineExtension(mimeType) {
  switch (mimeType) {
    case 'text/html':
      return '.html'
    case 'text/xml':
    case 'application/xml':
      return '.xml'
    default:
      return '.html'
  }
}

export const generateHtmlMap = async <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>
): Promise<Map<string, { content: string | ArrayBuffer; mimeType: string }>> => {
  const htmlMap = new Map<string, { content: string | ArrayBuffer; mimeType: string }>()
  const baseURL = 'http://localhost'

  for (const route of inspectRoutes(app)) {
    if (route.isMiddleware) continue

    const url = new URL(route.path, baseURL).toString()
    const response = await app.fetch(new Request(url))
    const content = await parseResponseContent(response)

    const contentType = response.headers.get('Content-Type')
    const mimeType = contentType ? contentType.split(';')[0] : 'text/plain'

    htmlMap.set(route.path, { content, mimeType })
  }

  return htmlMap
}

export const saveHtmlToLocal = async (
  htmlMap: Map<string, { content: string | ArrayBuffer; mimeType: string }>,
  fsModule: FileSystemModule,
  outDir: string
): Promise<string[]> => {
  const files: string[] = []

  for (const [routePath, { content, mimeType }] of htmlMap) {
    const extension = determineExtension(mimeType)
    const fileName = routePath === '/' ? `index${extension}` : `${routePath}${extension}`
    const filePath = path.join(outDir, fileName)
    const dirPath = path.dirname(filePath)

    await fsModule.mkdir(dirPath, { recursive: true })
    if (Buffer.isBuffer(content) || typeof content === 'string') {
      await fsModule.writeFile(filePath, content)
    } else {
      await fsModule.writeFile(filePath, Buffer.from(content))
    }
    files.push(filePath)
  }

  return files
}

export interface ToSSGInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  (
    app: Hono<E, S, BasePath>,
    fsModule: FileSystemModule,
    options?: { dir?: string }
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
    const maps = await generateHtmlMap(app)
    const files = await saveHtmlToLocal(maps, fs, outputDir)
    return { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return { success: false, error: errorObj }
  }
}
