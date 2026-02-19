import { html } from '../html'
import type { SSGPlugin } from './ssg'

/**
 * The default plugin that defines the recommended behavior.
 *
 * @experimental
 * `defaultPlugin` is an experimental feature.
 * The API might be changed.
 */
export const defaultPlugin = (): SSGPlugin => {
  return {
    afterResponseHook: (res) => {
      if (res.status !== 200) {
        return false
      }
      return res
    },
  }
}

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308])

const generateRedirectHtml = (location: string) => {
  // prettier-ignore
  const content = html`<!DOCTYPE html>
<title>Redirecting to: ${location}</title>
<meta http-equiv="refresh" content="0;url=${location}" />
<meta name="robots" content="noindex" />
<link rel="canonical" href="${location}" />
<body>
<a href="${location}">Redirecting to <code>${location}</code></a>
</body>
`
  return content.toString().replace(/\n/g, '')
}

/**
 * The redirect plugin that generates HTML redirect pages for HTTP redirect responses for status codes 301, 302, 303, 307 and 308.
 *
 * When used with `defaultPlugin`, place `redirectPlugin` before it, because `defaultPlugin` skips non-200 responses.
 *
 * ```ts
 * // ✅ Will work as expected
 * toSSG(app, fs, { plugins: [redirectPlugin(), defaultPlugin()] })
 *
 * // ❌ Will not work as expected
 * toSSG(app, fs, { plugins: [defaultPlugin(), redirectPlugin()] })
 * ```
 *
 * @experimental
 * `redirectPlugin` is an experimental feature.
 * The API might be changed.
 */
export const redirectPlugin = (): SSGPlugin => {
  return {
    afterResponseHook: (res) => {
      if (REDIRECT_STATUS_CODES.has(res.status)) {
        const location = res.headers.get('Location')
        if (!location) {
          return false
        }
        const htmlBody = generateRedirectHtml(location)
        return new Response(htmlBody, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
      return res
    },
  }
}
