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
 * The redirect plugin that generates HTML redirect pages for HTTP 301 and 302 responses.
 *
 * When used with `defaultPlugin`, place `redirectPlugin` before it, because `defaultPlugin` skips non-200 responses.
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
        const html = generateRedirectHtml(location)
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
      return res
    },
  }
}
