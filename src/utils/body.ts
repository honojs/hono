export async function parseBody(r: Request | Response): Promise<Record<string, string | File>> {
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
  return body
}
