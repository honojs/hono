import type { Context } from '../../context'
import { createMiddleware, getCookie, html, setCookie } from '../../helper'
import type { HtmlEscapedString } from '../../utils/html'
import { sign, verify } from '../jwt'

const sessionSymbol = Symbol('csrfSession')

declare module '../../context' {
  interface ContextVariableMap {
    [sessionSymbol]?: string
    csrfInput: () => Promise<HtmlEscapedString>
    csrfToken: () => Promise<string>
  }
}

type CsrfConfig = {
  /**
   * Strategy for checking CSRF tokens
   * - `both`: Check both header and form field
   * - `header`: Check header only (for Fetch requests)
   * - `form`: Check form field only (for HTML forms)
   */
  strategy: 'both' | 'header' | 'form'
  /**
   * Name of the form field that contains the CSRF token
   */
  tokenFormField: string
  /**
   * Header name that contains CSRF token for API requests
   */
  tokenHeader: string
  /**
   * Name of a specific cookie that contains CSRF token for use in JS requests
   */
  tokenCookie: string
  /**
   * Name of a specific session cookie that is used to compare CSRF tokens
   */
  sessionCookie: string
  /**
   * Algorithm used for signing and verifying tokens
   */
  algorithm: 'HS256' | 'HS384' | 'HS512'
  /**
   * Request methods that should be checked for CSRF tokens
   */
  protectRequestMethods: Set<string>
  /**
   * Paths that should be ignored for CSRF token checks
   */
  ignoredPaths?: ReadonlyArray<string | RegExp>
}

export function csrf(secret: string, options: Partial<CsrfConfig> = {}) {
  const config: CsrfConfig = {
    strategy: 'both',
    tokenFormField: '_csrf',
    tokenHeader: 'X-CSRF-Token',
    tokenCookie: '__Host-csrf_token',
    sessionCookie: '__Host-csrf_session',
    algorithm: 'HS256' as const,
    protectRequestMethods: new Set(['POST', 'PUT', 'PATCH', 'DELETE']),
    ...options,
  }

  const checkHeaders = config.strategy === 'both' || config.strategy === 'header'
  const checkForms = config.strategy === 'both' || config.strategy === 'form'

  const getSessionCookie = (c: Context) => getCookie(c, config.sessionCookie)

  const createSessionCookie = async (c: Context) => {
    const session = await sign({ id: crypto.randomUUID(), session: true }, secret, config.algorithm)
    setCookie(c, config.sessionCookie, session, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      secure: true,
    })
    c.set(sessionSymbol, session)
  }

  const getSessionId = async (c: Context) => {
    const sessionToken = getSessionCookie(c) ?? c.get(sessionSymbol)
    if (!sessionToken) {
      throw new Error('Missing CSRF session identifier')
    }
    try {
      const { id } = await verify(sessionToken, secret, config.algorithm)
      return id
    } catch (error) {
      throw new Error('Invalid CSRF session identifier')
    }
  }

  const createToken = async (c: Context) =>
    await sign(
      { id: await getSessionId(c), tok: `tok_${getRandomBytes(16)}` },
      secret,
      config.algorithm
    )

  const generateCsrfInput = async (c: Context) => {
    return html`<input
      type="hidden"
      name="${config.tokenFormField}"
      value="${await createToken(c)}"
    />`
  }

  const hasCsrfCookie = (c: Context) => !!getCookie(c, config.sessionCookie)

  const createCsrfCookie = async (c: Context) => {
    setCookie(c, config.tokenCookie, await createToken(c), {
      httpOnly: false,
      sameSite: 'Lax',
      path: '/',
      secure: true,
    })
  }

  const csrfTokenMatchesSession = async (c: Context): Promise<boolean> => {
    let token: string | undefined

    // Get token from request body
    if (checkForms) {
      try {
        const body = await c.req.formData()
        if (body) {
          const value = body.get(config.tokenFormField)
          if (typeof value === 'string') {
            token = value
          }
        }
      } catch (cause) {
        // no-op
      }
    }

    // Get token from request header
    if (checkHeaders) {
      try {
        if (!token) {
          token = c.req.header(config.tokenHeader)
        }
      } catch (cause) {
        // no-op
      }
    }

    if (!token) {
      return false
    }

    try {
      // Verify token
      const { id, tok } = await verify(token, secret, config.algorithm)
      // Ensure tok_ prefix is present and session ID matches
      return /^tok_/.test(tok) && id === (await getSessionId(c))
    } catch (err) {
      return false
    }
  }

  return createMiddleware(async (c, next) => {
    // Skip entirely for ignored paths
    if (
      config.ignoredPaths?.some((path) =>
        typeof path === 'string' ? path === c.req.path : path.test(c.req.path)
      )
    ) {
      return next()
    }

    // Add CSRF session cookie
    if (!getSessionCookie(c)) {
      await createSessionCookie(c)
    }

    // Set CSRF functions on context
    c.set('csrfInput', async () => await generateCsrfInput(c))
    c.set('csrfToken', async () => await createToken(c))

    // Set CSRF token cookie
    if (checkHeaders && !hasCsrfCookie(c)) {
      await createCsrfCookie(c)
    }

    // If request method is not protected, skip
    if (!config.protectRequestMethods.has(c.req.method)) {
      return next()
    }

    // Otherwise, get the token supplied by the client
    if (await csrfTokenMatchesSession(c)) {
      return next()
    }

    if (c.req.header('Accept')?.includes('application/json')) {
      return c.json({ error: 'CSRF token mismatch' }, 403)
    }

    return c.text('CSRF token mismatch', 403)
  })
}

function encodeBuffer(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function getRandomBytes(length: number) {
  return encodeBuffer(crypto.getRandomValues(new Uint8Array(length)))
}
