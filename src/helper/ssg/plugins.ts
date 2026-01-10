import type { SSGPlugin } from './ssg'

const generateRedirectHtml = (from: string, to: string) => {
  const html = `<!DOCTYPE html>
<title>Redirecting to: ${to}</title>
<meta http-equiv="refresh" content="0;url=${to}" />
<meta name="robots" content="noindex" />
<link rel="canonical" href="${to}" />
<body>
  <a href="${to}">Redirecting from <code>${from}</code> to <code>${to}</code></a>
</body>`
  return html.replace(/\n/g, '')
}

/**
 * Redirect plugin for Hono SSG.
 *
 * Generates HTML redirect pages for HTTP 301 and 302 responses.
 *
 * @returns A SSGPlugin that generates HTML redirect pages.
 *
 * @experimental
 * `redirectPlugin` is an experimental feature.
 * The API might be changed.
 */
export const redirectPlugin = (): SSGPlugin => {
  return {
    afterResponseHook: (res) => {
      if (res.status === 301 || res.status === 302) {
        const location = res.headers.get('Location')
        if (!location) {
          return false
        }
        const html = generateRedirectHtml('', location)
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
      return res
    },
  }
}
