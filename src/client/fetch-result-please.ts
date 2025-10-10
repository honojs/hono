/**
 * @description This file is a modified version of `fetch-result-please` (`ofetch`), minimalized and adapted to Hono's custom needs.
 *
 * @link https://www.npmjs.com/package/fetch-result-please
 */

const nullBodyResponses = new Set([101, 204, 205, 304])

/**
 * Smartly parses and return the consumable result from a fetch `Response`.
 *
 * Throwing a structured error if the response is not `ok`. ({@link DetailedError})
 */
export async function fetchRP(fetchRes: Response | Promise<Response>): Promise<any> {
  const _fetchRes = (await fetchRes) as unknown as Response & {
    _data: any
    /**
     * @description BodyInit property from whatwg-fetch polyfill
     *
     * @link https://github.com/JakeChampion/fetch/blob/main/fetch.js#L238
     */
    _bodyInit?: any
  }

  const hasBody =
    (_fetchRes.body || _fetchRes._bodyInit) && !nullBodyResponses.has(_fetchRes.status)

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
    this.name = 'DetailedError'
    this.log = options.log
    this.detail = options.detail
    this.code = options.code
    this.statusCode = options.statusCode
  }
}

// This is used to match the content-type header for 'json'
const jsonRegex = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(?:;.+)?$/i

function detectResponseType(response: Response): 'json' | 'text' {
  const _contentType = response.headers.get('content-type')

  if (!_contentType) {
    return 'text'
  }

  // `_contentType` might look like: `application/json; charset=utf-8`, `text/plain`, so we get the first part before `;`
  const contentType = _contentType.split(';').shift()!

  if (jsonRegex.test(contentType)) {
    return 'json'
  }

  return 'text'
}
