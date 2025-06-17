import path from 'node:path'
import type { SSGPlugin } from '../ssg'
import { DEFAULT_OUTPUT_DIR } from '../ssg'

export type SitemapPluginOptions = {
  baseURL: string
}

export const sitemapPlugin = ({ baseURL }: SitemapPluginOptions): SSGPlugin => {
  return {
    afterGenerateHook: async (result, fsModule, options) => {
      const outputDir = options?.dir ?? DEFAULT_OUTPUT_DIR
      const filePath = path.join(outputDir, 'sitemap.xml')
      const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
      const urls = result.files.map((file) => {
        const cleanedFile = file.startsWith('./') ? file.slice(2) : file
        const encodedFile = encodeURI(cleanedFile)
        return `${normalizedBaseURL}${encodedFile}`
      })
      const siteMapText = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `<url><loc>${url}</loc></url>`).join('\n')}
</urlset>`
      await fsModule.writeFile(filePath, siteMapText)
    },
  }
}
