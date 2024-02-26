import { escapeToBuffer, stringBufferToString, raw } from '../../utils/html'
import type { StringBuffer, HtmlEscaped, HtmlEscapedString } from '../../utils/html'

export { raw }

export const html = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): HtmlEscapedString | Promise<HtmlEscapedString> => {
  const buffer: StringBuffer = ['']

  for (let i = 0, len = strings.length - 1; i < len; i++) {
    buffer[0] += strings[i]

    const children =
      values[i] instanceof Array ? (values[i] as Array<unknown>).flat(Infinity) : [values[i]]
    for (let i = 0, len = children.length; i < len; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = children[i] as any
      if (typeof child === 'string') {
        escapeToBuffer(child, buffer)
      } else if (typeof child === 'number') {
        ;(buffer[0] as string) += child
      } else if (typeof child === 'boolean' || child === null || child === undefined) {
        continue
      } else if (typeof child === 'object' && (child as HtmlEscaped).isEscaped) {
        if ((child as HtmlEscapedString).callbacks) {
          buffer.unshift('', child)
        } else {
          const tmp = child.toString()
          if (tmp instanceof Promise) {
            buffer.unshift('', tmp)
          } else {
            buffer[0] += tmp
          }
        }
      } else if (child instanceof Promise) {
        buffer.unshift('', child)
      } else {
        escapeToBuffer(child.toString(), buffer)
      }
    }
  }
  buffer[0] += strings[strings.length - 1]

  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer)
}
