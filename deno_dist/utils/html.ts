type HtmlEscapedCallbackOpts = { error?: Error; buffer?: [string] }
export type HtmlEscapedCallback = (opts: HtmlEscapedCallbackOpts) => Promise<string>
export type HtmlEscaped = {
  isEscaped: true
  callbacks?: HtmlEscapedCallback[]
}
export type HtmlEscapedString = string & HtmlEscaped
export type StringBuffer = (string | Promise<string>)[]
import { raw } from '../helper/html/index.ts'

// The `escapeToBuffer` implementation is based on code from the MIT licensed `react-dom` package.
// https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/server/escapeTextForBrowser.js

const escapeRe = /[&<>'"]/

export const stringBufferToString = async (buffer: StringBuffer): Promise<HtmlEscapedString> => {
  let str = ''
  const callbacks: HtmlEscapedCallback[] = []
  for (let i = buffer.length - 1; i >= 0; i--) {
    let r = await buffer[i]
    if (typeof r === 'object') {
      callbacks.push(...((r as HtmlEscapedString).callbacks || []))
    }
    r = await (typeof r === 'object' ? (r as HtmlEscapedString).toString() : r)
    if (typeof r === 'object') {
      callbacks.push(...((r as HtmlEscapedString).callbacks || []))
    }
    str += r
  }

  return raw(str, callbacks)
}

export const escapeToBuffer = (str: string, buffer: StringBuffer): void => {
  const match = str.search(escapeRe)
  if (match === -1) {
    buffer[0] += str
    return
  }

  let escape
  let index
  let lastIndex = 0

  for (index = match; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;'
        break
      case 39: // '
        escape = '&#39;'
        break
      case 38: // &
        escape = '&amp;'
        break
      case 60: // <
        escape = '&lt;'
        break
      case 62: // >
        escape = '&gt;'
        break
      default:
        continue
    }

    buffer[0] += str.substring(lastIndex, index) + escape
    lastIndex = index + 1
  }

  buffer[0] += str.substring(lastIndex, index)
}

export const resolveStream = (str: string | HtmlEscapedString): Promise<string> => {
  if (!(str as HtmlEscapedString).callbacks?.length) {
    return Promise.resolve(str)
  }
  const callbacks = (str as HtmlEscapedString).callbacks as HtmlEscapedCallback[]
  const buffer = [str] as [string]
  return Promise.all(callbacks.map((c) => c({ buffer }))).then((res) => buffer[0] + res.join(''))
}
