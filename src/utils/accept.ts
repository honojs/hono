export interface Accept {
  type: string
  params: Record<string, string>
  q: number
}

/**
 * Parse an Accept header into an array of objects with type, parameters, and quality score.
 * @param acceptHeader The Accept header string
 * @returns An array of parsed Accept values
 */
export const parseAccept = (acceptHeader: string): Accept[] => {
  if (!acceptHeader) {
    return []
  }

  const acceptValues = splitByDelimiterOutsideQuotes(acceptHeader, ',').map((value, index) => ({
    value,
    index,
  }))

  return acceptValues
    .map(parseAcceptValue)
    .filter((item): item is Accept & { index: number } => Boolean(item))
    .sort(sortByQualityAndIndex)
    .map(({ type, params, q }) => ({ type, params, q }))
}

const splitByDelimiterOutsideQuotes = (value: string, delimiter: string): string[] => {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let escaped = false

  for (let i = 0; i < value.length; i++) {
    const char = value[i]

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\' && inQuotes) {
      current += char
      escaped = true
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      current += char
      continue
    }

    if (char === delimiter && !inQuotes) {
      parts.push(current)
      current = ''
      continue
    }

    current += char
  }

  parts.push(current)
  return parts
}

const parseAcceptValue = ({ value, index }: { value: string; index: number }) => {
  const parts = splitByDelimiterOutsideQuotes(value.trim(), ';').map((s) => s.trim())
  const type = parts[0]
  if (!type) {
    return null
  }

  const params = parseParams(parts.slice(1))
  const q = parseQuality(params.q)

  return { type, params, q, index }
}

const parseParams = (paramParts: string[]): Record<string, string> => {
  return paramParts.reduce<Record<string, string>>((acc, param) => {
    const separatorIndex = param.indexOf('=')
    if (separatorIndex <= 0) {
      return acc
    }

    const key = param.slice(0, separatorIndex).trim()
    const rawVal = param.slice(separatorIndex + 1).trim()
    if (!key || !rawVal) {
      return acc
    }

    const val = parseParamValue(rawVal)
    if (val !== null) {
      acc[key] = val
    }

    return acc
  }, {})
}

const parseParamValue = (value: string): string | null => {
  if (value[0] !== '"') {
    return value.includes('=') ? null : value
  }

  return parseQuotedString(value)
}

const parseQuotedString = (value: string): string | null => {
  let unescaped = ''
  let escaped = false

  for (let i = 1; i < value.length; i++) {
    const char = value[i]

    if (escaped) {
      unescaped += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      return value.slice(i + 1).trim() ? null : unescaped
    }

    unescaped += char
  }

  return null
}

const parseQuality = (qVal?: string): number => {
  if (qVal === undefined) {
    return 1
  }
  if (qVal === '') {
    return 1
  }
  if (qVal === 'NaN') {
    return 0
  }

  const num = Number(qVal)
  if (num === Infinity) {
    return 1
  }
  if (num === -Infinity) {
    return 0
  }
  if (Number.isNaN(num)) {
    return 1
  }
  if (num < 0 || num > 1) {
    return 1
  }

  return num
}

const sortByQualityAndIndex = (a: Accept & { index: number }, b: Accept & { index: number }) => {
  const qDiff = b.q - a.q
  if (qDiff !== 0) {
    return qDiff
  }
  return a.index - b.index
}
