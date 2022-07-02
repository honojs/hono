import { escape } from '../../utils/html.ts'

export type HtmlEscapedString = string & { isEscaped: true }

export const raw = (value: any): HtmlEscapedString => {
  const escapedString = new String(value) as HtmlEscapedString
  escapedString.isEscaped = true

  return escapedString
}

export const html = (strings: TemplateStringsArray, ...values: any[]): HtmlEscapedString => {
  let result = ''

  for (let i = 0, len = strings.length - 1; i < len; i++) {
    result += strings[i]

    const children = values[i] instanceof Array ? values[i].flat(Infinity) : [values[i]]
    for (let i = 0, len = children.length; i < len; i++) {
      const child = children[i]
      if (typeof child === 'boolean' || child === null || child === undefined) {
        continue
      } else if (typeof child === 'object' && (child as any).isEscaped) {
        result += child
      } else {
        result += escape(child.toString())
      }
    }
  }
  result += strings[strings.length - 1]

  return raw(result)
}
