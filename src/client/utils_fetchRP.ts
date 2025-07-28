/* eslint @typescript-eslint/no-explicit-any: 0 */

// References & credits: `fetch-result-please`, `ofetch`

const nullBodyResponses = new Set([101, 204, 205, 304])

/**
 * Smartly parses and return the consumable result from a fetch `Response`.
 */
export async function fetchRP(fetchRes: Response | Promise<Response>): Promise<any> {
  const _fetchRes = (await fetchRes) as unknown as Response & { _data: any }

  const hasBody = _fetchRes.body && !nullBodyResponses.has(_fetchRes.status)

  if (hasBody) {
    const responseType = detectResponseType(_fetchRes)
    _fetchRes._data = await _fetchRes[responseType]()
  }

  if (!_fetchRes.ok) {
    throw new DetailedError(`${_fetchRes.status} ${_fetchRes.statusText}`, {
      statusCode: _fetchRes?.status,
      detail: {
        data: _fetchRes?._data,
        statusText: _fetchRes?.statusText,
      },
    })
  }

  return _fetchRes._data
}

export class DetailedError extends Error {
  /**
   * Additional `message` that will be logged AND returned to client
   */
  public detail?: any
  /**
   * Additional `code` that will be logged AND returned to client
   */
  public code?: any
  /**
   * Additional value that will be logged AND NOT returned to client
   */
  public log?: any
  /**
   * Optionally set the status code to return, in a web server context
   */
  public statusCode?: any

  constructor(
    message: string,
    options: { detail?: any; code?: any; statusCode?: number; log?: any } = {}
  ) {
    super(message)
    this.log = options.log
    this.detail = options.detail
    this.code = options.code
    this.statusCode = options.statusCode
  }
}

const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(?:;.+)?$/i
function detectResponseType(response: Response): 'json' | 'text' {
  const _contentType = response.headers.get('content-type')

  // TODO: Do we actually need this line?, Hono always help the user set the `content-type`, including default for `c.body()`
  if (!_contentType) {
    return 'text'
  }

  // Value might look like: `application/json; charset=utf-8`, `text/plain`
  const contentType = _contentType.split(';').shift()!

  if (JSON_RE.test(contentType)) {
    return 'json'
  }

  return 'text'
}
