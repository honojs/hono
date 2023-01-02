export type BodyData = Record<string, string | File>

export async function parseBody(r: Request | Response) {
  let body: BodyData = {}
  const contentType = r.headers.get('Content-Type')
  if (
    contentType &&
    (contentType.startsWith('multipart/form-data') ||
      contentType === 'application/x-www-form-urlencoded')
  ) {
    const form: BodyData = {}
    ;(await r.formData()).forEach((value, key) => {
      form[key] = value
    })
    body = form
  }
  return body
}
