export type HtmlEscapedString = string & { isEscaped: true }

const entityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}
const escapeRe = new RegExp(`[${Object.keys(entityMap).join('')}]`, 'g')
const replaceFn = (m: string) => entityMap[m]
export const escape = (str: string): string => {
  return str.replace(escapeRe, replaceFn)
}
