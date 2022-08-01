export type HtmlEscaped = { isEscaped: true }
export type HtmlEscapedString = string & HtmlEscaped
export type Buffer = [string]

// The `escape` and `escapeToBuffer` implementations are based on code from the MIT licensed `react-dom` package.
// https://github.com/facebook/react/blob/main/packages/react-dom/src/server/escapeTextForBrowser.js

const escapeRe = /[&<>"]/

export const escape = (str: string): string => {
  // This function is an alias for `escapeToBuffer`,
  // but returns immediately if `str` does not contain the character to be escaped.
  const match = str.search(escapeRe)
  if (match === -1) {
    return str
  }

  const buffer: Buffer = ['']
  escapeToBuffer(str, buffer)
  return buffer[0]
}

export const escapeToBuffer = (str: string, buffer: Buffer): void => {
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
