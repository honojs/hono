import { Buffer } from "node:buffer";
import * as path from 'node:path'
import { inspectRoutes } from '../../helper/dev/index.ts'
import type { Hono } from '../../hono.ts'
import type { Env } from '../../types.ts'

interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void>
}

export const toSsg = async (app: Hono<Env>, fsModule: FileSystemModule) => {
  const routes = inspectRoutes(app).map((route) => route.path)
  const baseURL = 'http://localhost'

  await Promise.all(
    routes.map(async (route) => {
      const url = new URL(route, baseURL).toString()
      const response = await app.fetch(new Request(url))
      const html = await response.text()

      const filePath = path.join('./static', route === '/' ? 'index.html' : route + '.html')
      const dirPath = path.dirname(filePath)

      await fsModule.mkdir(dirPath, { recursive: true })
      await fsModule.writeFile(filePath, html)
      console.log(`File written: ${filePath}`)
    })
  )

  console.log('Static site generation completed.')
}

// export const toSsg = async (app: Hono<Env>, fsModule: FileSystemModule) => {
//   const routes = inspectRoutes(app).map((route) => route.path)
//   const baseURL = 'http://localhost'

//   for (const route of routes) {
//     const url = new URL(route, baseURL).toString()
//     const response = await app.fetch(new Request(url))
//     const html = await response.text()

//     const filePath = path.join('./static', route === '/' ? 'index.html' : route + '.html')
//     const dirPath = path.dirname(filePath)

//     await fsModule.mkdir(dirPath, { recursive: true })
//     await fsModule.writeFile(filePath, html)
//     console.log(`File written: ${filePath}`)
//   }
//   console.log('Static site generation completed.')
// }
