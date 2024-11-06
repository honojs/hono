/**
 * @module
 * This module provides Hono's JSX runtime.
 */

export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime'
export { jsxDEV as jsxs } from './jsx-dev-runtime'
export type { JSX } from './jsx-dev-runtime'
import { html, raw } from '../helper/html'
import type { HtmlEscapedString, StringBuffer, HtmlEscaped } from '../utils/html'
import { escapeToBuffer, stringBufferToString } from '../utils/html'
import { styleObjectForEach } from './utils'

export { html as jsxTemplate }

export const jsxAttr = (
  key: string,
  v: string | Promise<string> | Record<string, string | number | null | undefined | boolean>
): HtmlEscapedString | Promise<HtmlEscapedString> => {
  const buffer: StringBuffer = [`${key}="`] as StringBuffer
  if (key === 'style' && typeof v === 'object') {
    // object to style strings
    let styleStr = ''
    styleObjectForEach(v as Record<string, string | number>, (property, value) => {
      if (value != null) {
        styleStr += `${styleStr ? ';' : ''}${property}:${value}`
      }
    })
    escapeToBuffer(styleStr, buffer)
    buffer[0] += '"'
  } else if (typeof v === 'string') {
    escapeToBuffer(v, buffer)
    buffer[0] += '"'
  } else if (v === null || v === undefined) {
    return raw('')
  } else if (typeof v === 'number' || (v as unknown as HtmlEscaped).isEscaped) {
    buffer[0] += `${v}"`
  } else if (v instanceof Promise) {
    buffer.unshift('"', v)
  } else {
    escapeToBuffer(v.toString(), buffer)
    buffer[0] += '"'
  }

  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, undefined)
}

export const jsxEscape = (value: string) => value
