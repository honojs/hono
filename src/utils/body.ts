export const parseBody = async (
  r: Request | Response
): Promise<string | object | Record<string, string | File>> => {
  const contentType = r.headers.get('Content-Type') || ''

  if (contentType.includes('application/json')) {
    let body = {}
    try {
      body = await r.json()
    } catch {} // Do nothing
    return body
  } else if (contentType.includes('application/text')) {
    return await r.text()
  } else if (contentType.startsWith('text')) {
    return await r.text()
  } else if (contentType.includes('form')) {
    const form: Record<string, string | File> = {}
    const data = [...(await r.formData())].reduce((acc, cur) => {
      acc[cur[0]] = cur[1]
      return acc
    }, form)
    return data
  }

  return r.arrayBuffer()
}
