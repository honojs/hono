export const getRequest = (req: Request) => {
  const url = new URL(req.url)
  url.protocol = req.headers.get('x-forwarded-proto') ?? url.protocol
  url.host = req.headers.get('x-forwarded-host') ?? url.host
  return new Request(url, req)
}
