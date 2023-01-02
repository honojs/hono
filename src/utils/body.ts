export type BodyData = Record<string, string | File>

export async function parseBody<BodyType extends BodyData>(
  r: Request | Response
): Promise<BodyType> {
  let body: Record<string, string | File> = {}
  const contentType = r.headers.get('Content-Type')
  if (
    contentType &&
    (contentType.startsWith('multipart/form-data') ||
      contentType === 'application/x-www-form-urlencoded')
  ) {
    const form: Record<string, string | File> = {}
    ;(await r.formData()).forEach((value, key) => {
      form[key] = value
    })
    body = form
  }
  return body as BodyType
}
