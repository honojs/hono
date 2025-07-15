const HEADER_END = [13, 10, 13, 10] // \r\n\r\n

function findHeaderEnd(buff: Uint8Array): number {
  for (let i = 0; i <= buff.length - HEADER_END.length; i++) {
    let found = true
    for (let j = 0; j < HEADER_END.length; j++) {
      if (buff[i + j] !== HEADER_END[j]) {
        found = false
        break
      }
    }
    if (found) {
      return i + HEADER_END.length
    }
  }
  return -1
}

export async function parseHTTP(input: ReadableStream<Uint8Array>) {
  const reader = input.getReader()

  // first, continue reading until we find the end of the headers
  let httpMetadata = new Uint8Array(0)
  let firstBody = new Uint8Array(0)
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      return null // unexpected end of stream
    }
    httpMetadata = new Uint8Array([...httpMetadata, ...value])
    const headerEndIndex = findHeaderEnd(httpMetadata)
    if (headerEndIndex !== -1) {
      // end of headers found
      firstBody = httpMetadata.slice(headerEndIndex)
      httpMetadata = httpMetadata.slice(0, headerEndIndex)
      break
    }
  }
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(firstBody)
      firstBody = new Uint8Array(0) // for memory efficiency
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          break
        }
        controller.enqueue(value)
      }
    },
  })
  const metadataText = new TextDecoder().decode(httpMetadata)
  const [requestLine, ...headerLines] = metadataText.split('\r\n')
  if (!requestLine) {
    return null // invalid request line
  }
  const [method, path, version] = requestLine.split(' ')
  if (!method || !path || !version) {
    return null
  }
  if (version !== 'HTTP/1.1') {
    // currently only support HTTP/1.1
    // moddable's http module too
    return null
  }
  const headers: Record<string, string> = {}
  for (const line of headerLines) {
    if (line.trim() === '') {continue} // skip empty lines
    const keyValueIndex = line.indexOf(':')
    if (keyValueIndex === -1) {
      continue // invalid header line
    }
    const key = line.slice(0, keyValueIndex).trim()
    const value = line.slice(keyValueIndex + 1).trim()
    headers[key.toLowerCase()] = value
  }

  return {
    method,
    path,
    version,
    headers,
    body,
  }
}
