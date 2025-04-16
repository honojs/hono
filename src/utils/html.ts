/**
 * @module
 * HTML utility.
 */

export const HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3,
} as const
interface HtmlEscapedCallbackOpts {
  buffer?: [string]
  phase: (typeof HtmlEscapedCallbackPhase)[keyof typeof HtmlEscapedCallbackPhase]
  context: Readonly<object> // An object unique to each JSX tree. This object is used as the WeakMap key.
}
export type HtmlEscapedCallback = (opts: HtmlEscapedCallbackOpts) => Promise<string> | undefined
export interface HtmlEscaped {
  isEscaped: true
  callbacks?: HtmlEscapedCallback[]
}
export type HtmlEscapedString = string & HtmlEscaped

/**
 * StringBuffer contains string and Promise<string> alternately
 * The length of the array will be odd, the odd numbered element will be a string,
 * and the even numbered element will be a Promise<string>.
 * When concatenating into a single string, it must be processed from the tail.
 * @example
 * [
 *   'framework.',
 *   Promise.resolve('ultra fast'),
 *   'a ',
 *   Promise.resolve('is '),
 *   'Hono',
 * ]
 */
export type StringBuffer = (string | Promise<string>)[]
export type StringBufferWithCallbacks = StringBuffer & { callbacks: HtmlEscapedCallback[] }

export const raw = (value: unknown, callbacks?: HtmlEscapedCallback[]): HtmlEscapedString => {
  const escapedString = new String(value) as HtmlEscapedString
  escapedString.isEscaped = true
  escapedString.callbacks = callbacks

  return escapedString
}

// The `escapeToBuffer` implementation is based on code from the MIT licensed `react-dom` package.
// https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/server/escapeTextForBrowser.js

const escapeRe = /[&<>'"]/

export const stringBufferToString = async (
  buffer: StringBuffer,
  callbacks: HtmlEscapedCallback[] | undefined
): Promise<HtmlEscapedString> => {
  let str = ''
  callbacks ||= []
  const resolvedBuffer = await Promise.all(buffer)
  for (let i = resolvedBuffer.length - 1; ; i--) {
    str += resolvedBuffer[i]
    i--
    if (i < 0) {
      break
    }

    let r = resolvedBuffer[i]
    if (typeof r === 'object') {
      callbacks.push(...((r as HtmlEscapedString).callbacks || []))
    }

    const isEscaped = (r as HtmlEscapedString).isEscaped
    r = await (typeof r === 'object' ? (r as HtmlEscapedString).toString() : r)
    if (typeof r === 'object') {
      callbacks.push(...((r as HtmlEscapedString).callbacks || []))
    }

    if ((r as HtmlEscapedString).isEscaped ?? isEscaped) {
      str += r
    } else {
      const buf = [str]
      escapeToBuffer(r, buf)
      str = buf[0]
    }
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

export const resolveCallbackSync = (str: string | HtmlEscapedString): string => {
  const callbacks = (str as HtmlEscapedString).callbacks as HtmlEscapedCallback[]
  if (!callbacks?.length) {
    return str
  }
  const buffer: [string] = [str]
  const context = {}

  callbacks.forEach((c) => c({ phase: HtmlEscapedCallbackPhase.Stringify, buffer, context }))

  return buffer[0]
}

export const resolveCallback = async (
  str: string | HtmlEscapedString | Promise<string>,
  phase: (typeof HtmlEscapedCallbackPhase)[keyof typeof HtmlEscapedCallbackPhase],
  preserveCallbacks: boolean,
  context: object,
  buffer?: [string]
): Promise<string> => {
  if (typeof str === 'object' && !(str instanceof String)) {
    if (!((str as unknown) instanceof Promise)) {
      str = (str as unknown as string).toString() // HtmlEscapedString object to string
    }
    if ((str as string | Promise<string>) instanceof Promise) {
      str = await (str as unknown as Promise<string>)
    }
  }

  const callbacks = (str as HtmlEscapedString).callbacks as HtmlEscapedCallback[]
  if (!callbacks?.length) {
    return Promise.resolve(str)
  }
  if (buffer) {
    buffer[0] += str
  } else {
    buffer = [str as string]
  }

  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then((res) =>
    Promise.all(
      res
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter<string>(Boolean as any)
        .map((str) => resolveCallback(str, phase, false, context, buffer))
    ).then(() => (buffer as [string])[0])
  )

  if (preserveCallbacks) {
    return raw(await resStr, callbacks)
  } else {
    return resStr
  }
}
