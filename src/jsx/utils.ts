const normalizeElementKeyMap: Map<string, string> = new Map([
  ['className', 'class'],
  ['htmlFor', 'for'],
  ['crossOrigin', 'crossorigin'],
  ['httpEquiv', 'http-equiv'],
  ['itemProp', 'itemprop'],
  ['fetchPriority', 'fetchpriority'],
  ['noModule', 'nomodule'],
  ['formAction', 'formaction'],
])
export const normalizeIntrinsicElementKey = (key: string): string =>
  normalizeElementKeyMap.get(key) || key

// eslint-disable-next-line no-control-regex
const invalidAttributeNameCharRe = /[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/
export const isValidAttributeName = (name: string): boolean => {
  const len = name.length
  if (len === 0) {
    return false
  }
  for (let i = 0; i < len; i++) {
    const c = name.charCodeAt(i)
    if (
      !(
        (c >= 0x61 && c <= 0x7a) || // a-z
        (c >= 0x41 && c <= 0x5a) || // A-Z
        (c >= 0x30 && c <= 0x39) || // 0-9
        c === 0x2d || // -
        c === 0x5f || // _
        c === 0x2e || // .
        c === 0x3a // :
      )
    ) {
      // non-fast-path character found — fall back to regex for the full name
      return !invalidAttributeNameCharRe.test(name)
    }
  }
  return true
}

export const styleObjectForEach = (
  style: Record<string, string | number>,
  fn: (key: string, value: string | null) => void
): void => {
  for (const [k, v] of Object.entries(style)) {
    const key =
      k[0] === '-' || !/[A-Z]/.test(k)
        ? k // a CSS variable or a lowercase only property
        : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`) // a camelCase property. convert to kebab-case
    fn(
      key,
      v == null
        ? null
        : typeof v === 'number'
          ? !key.match(
              /^(?:a|border-im|column(?:-c|s)|flex(?:$|-[^b])|grid-(?:ar|[^a])|font-w|li|or|sca|st|ta|wido|z)|ty$/
            )
            ? `${v}px`
            : `${v}`
          : v
    )
  }
}
