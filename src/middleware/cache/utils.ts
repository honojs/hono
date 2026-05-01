/**
 * @module
 * Pure parsers for Cache-Control / Vary headers used by the cache middleware.
 * No runtime dependencies; safe to unit-test in isolation.
 */

/**
 * Parse a comma-separated header value into a Map of lowercased directive
 * name -> raw value (string or undefined for valueless directives).
 * Handles quoted values: no-cache="Set-Cookie" -> Map { 'no-cache' => 'Set-Cookie' }.
 */

export const parseDirectiveList = (
  value: string | null | undefined
): Map<string, string | undefined> => {
  const out = new Map<string, string | undefined>()
  if (!value) {
    return out
  }
  // Split on commas that are NOT inside quotes
  let i = 0
  let buf = ''
  let inQuotes = false
  const tokens: string[] = []
  while (i < value.length) {
    const ch = value[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      buf += ch
    } else if (ch === ',' && !inQuotes) {
      tokens.push(buf)
      buf = ''
    } else {
      buf += ch
    }
    i++
  }
  if (buf.length) {
    tokens.push(buf)
  }
  for (const raw of tokens) {
    const t = raw.trim()
    if (!t) {
      continue
    }
    const eq = t.indexOf('=')
    if (eq === -1) {
      out.set(t.toLowerCase(), undefined)
      continue
    }
    const name = t.slice(0, eq).trim().toLowerCase()
    let val = t.slice(eq + 1).trim()
    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
      val = val.slice(1, -1)
    }
    out.set(name, val)
  }
  return out
}

/**
 * Returns true when the response MUST NOT be stored (RFC 7234 §3).
 * Note: no-cache="..." and private="..." (field-list forms) are CACHEABLE;
 * they only require stripping the listed headers (handled separately).
 */

export const shouldNotStore = (cacheControl: string | null | undefined): boolean => {
  const dirs = parseDirectiveList(cacheControl)
  // Bare directives only - field list forms (with =) do not block storage
  if (dirs.has('no-store') && dirs.get('no-store') === undefined) {
    return true
  }
  if (dirs.has('no-cache') && dirs.get('no-cache') === undefined) {
    return true
  }
  if (dirs.has('private') && dirs.get('private') === undefined) {
    return true
  }
  return false
}

/**
 * Compute storage TTL from Cache-Control. Per RFC 7234 §5.2.2.9, s-maxage
 * overrides max-age for shared caches. Returns undefined when no TTL signal.
 */

export const parseMaxAge = (cacheControl: string | null | undefined): number | undefined => {
  const dirs = parseDirectiveList(cacheControl)
  const sMaxAge = dirs.get('s-maxage')
  const maxAge = dirs.get('max-age')
  const pick = sMaxAge ?? maxAge
  if (pick === undefined) {
    return undefined
  }
  const n = Number.parseInt(pick, 10)
  if (!Number.isFinite(n) || n < 0) {
    return undefined
  }
  return n
}

/** Comma-separated list -> trimmed, lowercased, deduped, sorted entries. */
export const parseHeaderList = (value: string | string[] | null | undefined): string[] => {
  const arr = Array.isArray(value) ? value : value ? value.split(',') : []
  const set = new Set<string>()
  for (const raw of arr) {
    const t = raw.trim().toLowerCase()
    if (t) {
      set.add(t)
    }
  }
  return Array.from(set).sort()
}

/**
 * Build a deterministic suffix for the cache key from Vary header values.
 * NUL is used as the separator because it cannot appear in HTTP header values.
 * Returns "" when there are no relevant headers (caller should NOT add ":").
 */
export const buildVaryKeySuffix = (varyHeaders: readonly string[], reqHeaders: Headers): string => {
  if (!varyHeaders.length) {
    return ''
  }
  const sorted = [...varyHeaders].map((h) => h.toLowerCase()).sort()
  const parts: string[] = []
  for (const name of sorted) {
    const v = reqHeaders.get(name) ?? ''
    parts.push(`${name}=${v}`)
  }
  return '\x00' + parts.join('\x00')
}
