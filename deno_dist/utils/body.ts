export async function parseBody<T = any>(r: Request | Response): Promise<T> {
  let body: any

  const contentType = r.headers.get('Content-Type') || ''

  if (contentType.includes('application/json')) {
    let jsonBody = {}
    try {
      jsonBody = await r.json()
    } catch {} // Do nothing
    body = jsonBody
  } else if (contentType.includes('application/text')) {
    body = await r.text()
  } else if (contentType.startsWith('text')) {
    body = await r.text()
  } else if (contentType.includes('form')) {
    const form: Record<string, string | File> = {}
    const data = [...(await r.formData())].reduce((acc, cur) => {
      acc[cur[0]] = cur[1]
      return acc
    }, form)
    body = data
  } else {
    body = await r.arrayBuffer()
  }

  return body as T
}
