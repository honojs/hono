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

export const html = (strings: TemplateStringsArray, ...values: any[]): HtmlEscapedString => {
  let result = ''

  for (let i = 0, len = strings.length - 1; i < len; i++) {
    result += strings[i]

    const value = values[i]
    if (typeof value === 'boolean' || value === null || value === undefined) {
      continue
    } else if (typeof value === 'object' && (value as any).isEscaped) {
      result += value
    } else {
      result += escape(value.toString())
    }
  }
  result += strings[strings.length - 1]

  const escapedString = new String(result) as HtmlEscapedString
  escapedString.isEscaped = true

  return escapedString
}
