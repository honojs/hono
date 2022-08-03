import { escapeToBuffer } from '../../utils/html.ts'
import type { StringBuffer, HtmlEscaped, HtmlEscapedString } from '../../utils/html.ts'

export const raw = (value: any): HtmlEscapedString => {
  const escapedString = new String(value) as HtmlEscapedString
  escapedString.isEscaped = true

  return escapedString
}

export const html = (strings: TemplateStringsArray, ...values: any[]): HtmlEscapedString => {
  const buffer: StringBuffer = ['']

  for (let i = 0, len = strings.length - 1; i < len; i++) {
    buffer[0] += strings[i]

    const children = values[i] instanceof Array ? values[i].flat(Infinity) : [values[i]]
    for (let i = 0, len = children.length; i < len; i++) {
      const child = children[i]
      if (typeof child === 'string') {
        escapeToBuffer(child, buffer)
      } else if (typeof child === 'boolean' || child === null || child === undefined) {
        continue
      } else if (
        (typeof child === 'object' && (child as HtmlEscaped).isEscaped) ||
        typeof child === 'number'
      ) {
        buffer[0] += child
      } else {
        escapeToBuffer(child.toString(), buffer)
      }
    }
  }
  buffer[0] += strings[strings.length - 1]

  return raw(buffer[0])
}
