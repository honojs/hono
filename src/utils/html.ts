export type HtmlEscaped = { isEscaped: true }
export type HtmlEscapedString = string & HtmlEscaped
export type StringBuffer = (string | Promise<string>)[]

// The `escapeToBuffer` implementation is based on code from the MIT licensed `react-dom` package.
// https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/server/escapeTextForBrowser.js

const escapeRe = /[&<>'"]/

export const stringBufferToString = async (buffer: StringBuffer): Promise<string> => {
  let str = ''
  for (let i = buffer.length - 1; i >= 0; i--) {
    const r = await buffer[i]
    str += await (typeof r === 'object' ? (r as HtmlEscapedString).toString() : r)
  }
  return str
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
