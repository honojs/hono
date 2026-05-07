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
const validAttributeNameCache = new Set<string>()
const validAttributeNameCacheMax = 1024
// reject HTML parser-control tag starters ('!' for comments/doctype, '?' for
// processing instructions) in addition to the shared invalid-char set
// eslint-disable-next-line no-control-regex
const invalidTagNameCharRe = /^[!?]|[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/
const validTagNameCache = new Set<unknown>()
const validTagNameCacheMax = 256

const cacheValidName = (cache: Set<unknown>, max: number, name: string): void => {
  if (cache.size >= max) {
    cache.clear()
  }
  cache.add(name)
}

export const isValidTagName = (name: unknown): name is string => {
  if (validTagNameCache.has(name)) {
    return true
  }
  if (typeof name !== 'string') {
    return false
  }
  if (name.length === 0) {
    return true
  }
  if (invalidTagNameCharRe.test(name)) {
    return false
  }
  cacheValidName(validTagNameCache, validTagNameCacheMax, name)
  return true
}

export const isValidAttributeName = (name: string): boolean => {
  if (validAttributeNameCache.has(name)) {
    return true
  }
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
      if (!invalidAttributeNameCharRe.test(name)) {
        cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, name)
        return true
      } else {
        return false
      }
    }
  }
  cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, name)
  return true
}

// eslint-disable-next-line no-control-regex
const invalidStylePropertyNameCharRe = /[\s"'():;\\/\[\]{}\x00-\x1f\x7f-\x9f]/
const validStylePropertyNameCache = new Set<string>()
const validStylePropertyNameCacheMax = 1024

const isValidStylePropertyName = (name: string): boolean => {
  if (validStylePropertyNameCache.has(name)) {
    return true
  }
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
        c === 0x5f // _
      )
    ) {
      // non-fast-path character found — fall back to regex for the full name
      if (!invalidStylePropertyNameCharRe.test(name)) {
        cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, name)
        return true
      } else {
        return false
      }
    }
  }
  cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, name)
  return true
}

const unsafeStyleValueCharRe = /[;"'\\/\[\](){}]/

const hasUnsafeStyleValue = (value: string): boolean => {
  if (!unsafeStyleValueCharRe.test(value)) {
    return false
  }

  let quote = 0
  const blockStack: number[] = []
  for (let i = 0, len = value.length; i < len; i++) {
    const c = value.charCodeAt(i)
    if (c === 0x5c) {
      if (i === len - 1) {
        return true
      }
      i++
    } else if (quote !== 0) {
      if (c === 0x0a || c === 0x0c || c === 0x0d) {
        return true
      }
      if (c === quote) {
        quote = 0
      }
    } else if (c === 0x2f && value.charCodeAt(i + 1) === 0x2a) {
      const end = value.indexOf('*/', i + 2)
      if (end === -1) {
        return true
      }
      i = end + 1
    } else if (c === 0x22 || c === 0x27) {
      quote = c
    } else if (c === 0x28) {
      blockStack.push(0x29)
    } else if (c === 0x5b) {
      blockStack.push(0x5d)
    } else if (c === 0x7b || c === 0x7d) {
      return true
    } else if (c === 0x29 || c === 0x5d) {
      if (blockStack[blockStack.length - 1] !== c) {
        return true
      }
      blockStack.pop()
    } else if (c === 0x3b && blockStack.length === 0) {
      return true
    }
  }
  return quote !== 0 || blockStack.length !== 0
}

export const styleObjectForEach = (
  style: Record<string, unknown>,
  fn: (key: string, value: string | null) => void
): void => {
  for (const [k, v] of Object.entries(style)) {
    const key =
      k[0] === '-' || !/[A-Z]/.test(k)
        ? k // a CSS variable or a lowercase only property
        : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`) // a camelCase property. convert to kebab-case
    if (!isValidStylePropertyName(key)) {
      continue
    }
    if (v == null) {
      fn(key, null)
      continue
    }
    let value: string
    if (typeof v === 'number') {
      value = !key.match(
        /^(?:a|border-im|column(?:-c|s)|flex(?:$|-[^b])|grid-(?:ar|[^a])|font-w|li|or|sca|st|ta|wido|z)|ty$/
      )
        ? `${v}px`
        : `${v}`
    } else if (typeof v === 'string') {
      if (hasUnsafeStyleValue(v)) {
        continue
      }
      value = v
    } else {
      continue
    }
    fn(key, value)
  }
}
