/**
 * @module
 * html Helper for Hono.
 */

import { escapeToBuffer, raw, resolveCallbackSync, stringBufferToString } from '../../utils/html'
import type { HtmlEscaped, HtmlEscapedString, StringBufferWithCallbacks } from '../../utils/html'

export { raw }

// Serializes a single interpolated value into `buffer`.
const appendInterpolatedValue = (value: unknown, buffer: StringBufferWithCallbacks): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const child = value as any
  if (typeof child === 'string') {
    escapeToBuffer(child, buffer)
  } else if (typeof child === 'number') {
    ;(buffer[0] as string) += child
  } else if (typeof child === 'boolean' || child === null || child === undefined) {
    return
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

// Serializes a single interpolated value (which may be an array of values) into `buffer`.
const appendInterpolation = (value: unknown, buffer: StringBufferWithCallbacks): void => {
  const children = Array.isArray(value) ? (value as Array<unknown>).flat(Infinity) : [value]
  for (let i = 0, len = children.length; i < len; i++) {
    appendInterpolatedValue(children[i], buffer)
  }
}

export const html = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): HtmlEscapedString | Promise<HtmlEscapedString> => {
  const buffer: StringBufferWithCallbacks = [''] as StringBufferWithCallbacks

  for (let i = 0, len = strings.length - 1; i < len; i++) {
    buffer[0] += strings[i]
    appendInterpolation(values[i], buffer)
  }
  buffer[0] += strings.at(-1) as string

  return buffer.length === 1
    ? 'callbacks' in buffer
      ? raw(resolveCallbackSync(raw(buffer[0], buffer.callbacks)))
      : raw(buffer[0])
    : stringBufferToString(buffer, buffer.callbacks)
}
