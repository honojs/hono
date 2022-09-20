export type BodyData = Record<string, string | number | boolean | File>

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
    body = [...(await r.formData())].reduce((acc, cur) => {
      acc[cur[0]] = cur[1]
      return acc
    }, form)
  }
  return body as BodyType
}
