export interface Accept {
  type: string
  params: Record<string, string>
  q: number
}

const isWhitespace = (char: number): boolean =>
  char === 32 || char === 9 || char === 10 || char === 13

const consumeWhitespace = (acceptHeader: string, startIndex: number): number => {
  while (startIndex < acceptHeader.length) {
    if (!isWhitespace(acceptHeader.charCodeAt(startIndex))) {
      break
    }
    startIndex++
  }
  return startIndex
}

const ignoreTrailingWhitespace = (acceptHeader: string, startIndex: number): number => {
  while (startIndex > 0) {
    if (!isWhitespace(acceptHeader.charCodeAt(startIndex - 1))) {
      break
    }
    startIndex--
  }
  return startIndex
}

const skipInvalidParam = (acceptHeader: string, startIndex: number): [number, boolean] => {
  while (startIndex < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(startIndex)
    if (char === 59) {
      // ';' => next param
      return [startIndex + 1, true]
    }
    if (char === 44) {
      // ',' => next accept value
      return [startIndex + 1, false]
    }
    startIndex++
  }
  return [startIndex, false]
}

const skipInvalidAcceptValue = (acceptHeader: string, startIndex: number): number => {
  let i = startIndex
  let inQuotes = false
  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i)
    if (inQuotes && char === 92) {
      // '\' => escape
      i++
    } else if (char === 34) {
      // '"' => toggle quotes
      inQuotes = !inQuotes
    } else if (!inQuotes && char === 44) {
      // ',' => next accept value
      return i + 1
    }
    i++
  }
  return i
}

// Parses the key portion of a param (up to '='), returns [nextIndex, key, earlyExit, earlyHasNext]
// earlyExit=true means we should return early with the given hasNext value
const parseParamKey = (
  acceptHeader: string,
  startIndex: number
): [number, string | undefined, boolean, boolean] => {
  let i = startIndex
  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i)
    if (char === 61) {
      // '=' => end of key
      const key = acceptHeader.slice(startIndex, ignoreTrailingWhitespace(acceptHeader, i))
      return [i + 1, key, false, false]
    }
    if (char === 59) {
      // ';' => invalid empty param, continue parsing params
      return [i + 1, undefined, true, true]
    }
    if (char === 44) {
      // ',' => invalid empty param, move to next accept value
      return [i + 1, undefined, true, false]
    }
    i++
  }
  // reached end without finding '='
  return [i, undefined, true, false]
}

// Parses a quoted param value starting at the opening '"'
// Returns [nextIndex, value or undefined, hasNext, done]
// done=true means caller should return immediately
const parseQuotedParamValue = (
  acceptHeader: string,
  key: string,
  paramStartIndex: number,
  i: number
): [number, string | undefined, boolean] => {
  // i is positioned just after the closing '"'
  let nextIndex = consumeWhitespace(acceptHeader, i)
  const nextChar = acceptHeader.charCodeAt(nextIndex)
  if (nextIndex < acceptHeader.length && !(nextChar === 59 || nextChar === 44)) {
    // not ';' or ',' => invalid trailing chars
    const skipResult = skipInvalidParam(acceptHeader, nextIndex)
    return [skipResult[0], undefined, skipResult[1]]
  }
  let value = acceptHeader.slice(paramStartIndex + 1, i - 1)
  if (value.includes('\\')) {
    value = value.replace(/\\(.)/g, '$1')
  }
  if (nextChar === 44) {
    // ',' => end of accept value
    return [nextIndex + 1, value, false]
  }
  const hasNext = nextChar === 59
  return [hasNext ? nextIndex + 1 : nextIndex, value, hasNext]
}

// Scans characters of an unquoted (or opening-quoted) param value.
// Returns [nextIndex, key, value or undefined, hasNext].
const scanParamValueChars = (
  acceptHeader: string,
  key: string,
  paramStartIndex: number
): [number, string | undefined, string | undefined, boolean] => {
  let inQuotes = false
  let i = paramStartIndex
  let value: string | undefined
  let hasNext = false

  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i)

    if (inQuotes && char === 92) {
      // '\' => escape
      i++
    } else if (char === 34) {
      // '"' => quote boundary
      if (inQuotes) {
        const [nextI, parsedValue, parsedHasNext] = parseQuotedParamValue(
          acceptHeader,
          key,
          paramStartIndex,
          i + 1
        )
        return [nextI, key, parsedValue, parsedHasNext]
      }
      inQuotes = true
    } else if (!inQuotes && (char === 59 || char === 44)) {
      // ';' or ',' => end of value
      value = acceptHeader.slice(paramStartIndex, ignoreTrailingWhitespace(acceptHeader, i))
      if (char === 59) {
        // ';' => has next param
        hasNext = true
      }
      i++
      break
    }
    i++
  }
  return [
    i,
    key,
    value ?? acceptHeader.slice(paramStartIndex, ignoreTrailingWhitespace(acceptHeader, i)),
    hasNext,
  ]
}

// Parses the value portion of a param (after '='), handling both quoted and unquoted values
const parseParamValue = (
  acceptHeader: string,
  key: string,
  startIndex: number
): [number, string | undefined, string | undefined, boolean] => {
  startIndex = consumeWhitespace(acceptHeader, startIndex)
  if (acceptHeader.charCodeAt(startIndex) === 61) {
    // '=' is invalid as a value
    const skipResult = skipInvalidParam(acceptHeader, startIndex + 1)
    return [skipResult[0], key, undefined, skipResult[1]]
  }

  return scanParamValueChars(acceptHeader, key, startIndex)
}

const getNextParam = (
  acceptHeader: string,
  startIndex: number
): [number, string | undefined, string | undefined, boolean] => {
  startIndex = consumeWhitespace(acceptHeader, startIndex)

  const [afterKey, key, earlyExit, earlyHasNext] = parseParamKey(acceptHeader, startIndex)
  if (earlyExit || key === undefined) {
    return [afterKey, undefined, undefined, earlyHasNext]
  }

  return parseParamValue(acceptHeader, key, afterKey)
}

const getNextAcceptValue = (
  acceptHeader: string,
  startIndex: number
): [number, Accept | undefined] => {
  const accept: Accept = {
    type: '',
    params: Object.create(null),
    q: 1,
  }
  startIndex = consumeWhitespace(acceptHeader, startIndex)
  let i = startIndex
  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i)
    if (char === 59 || char === 44) {
      // ';' or ',' => end of type
      accept.type = acceptHeader.slice(startIndex, ignoreTrailingWhitespace(acceptHeader, i))
      i++
      if (char === 44) {
        // ',' => end of value
        return [i, accept.type ? accept : undefined]
      }
      if (!accept.type) {
        return [skipInvalidAcceptValue(acceptHeader, i), undefined]
      }
      break // parse params
    }
    i++
  }
  if (!accept.type) {
    accept.type = acceptHeader.slice(
      startIndex,
      ignoreTrailingWhitespace(acceptHeader, acceptHeader.length)
    )
    return [acceptHeader.length, accept.type ? accept : undefined]
  }

  let param: string | undefined
  let value: string | undefined
  let hasNext: boolean
  while (i < acceptHeader.length) {
    ;[i, param, value, hasNext] = getNextParam(acceptHeader, i)
    if (param && value) {
      accept.params[param] = value
    }
    if (!hasNext) {
      break
    }
  }

  return [i, accept] as [number, Accept]
}

export const parseAccept = (acceptHeader: string): Accept[] => {
  if (!acceptHeader) {
    return []
  }

  const values: Accept[] = []
  let i = 0
  let accept: Accept | undefined
  let requiresSort = false // in many cases, accept values are already sorted by quality (e.g. "text/html, application/json;q=0.9, */*;q=0.8")
  let lastAccept: Accept | undefined
  while (i < acceptHeader.length) {
    ;[i, accept] = getNextAcceptValue(acceptHeader, i)
    if (accept) {
      accept.q = parseQuality(accept.params.q)
      values.push(accept)
      if (lastAccept && lastAccept.q < accept.q) {
        // find higher quality accept value, so we need to sort
        requiresSort = true
      }
      lastAccept = accept
    }
  }
  if (requiresSort) {
    values.sort((a, b) => b.q - a.q)
  }

  return values
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
