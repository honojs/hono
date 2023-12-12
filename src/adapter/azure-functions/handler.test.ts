import { Hono } from '../../hono'
import type { Logger } from './Context'
import type { Form, HttpMethod, HttpRequestHeaders, HttpRequestQuery, HttpRequestParams } from './http'
import type {
  Context,
  HttpRequest
} from './'
import {
  handle,
} from './'

describe('Azure Functions adapter', () => {
  const app = new Hono()
  app.all('/api/:funcname',  async (c) => {
    const message = 'Hello, Azure Functions and Hono!'
    const query = c.req.queries()
    const json_body = c.req.method === 'POST' ? await c.req.json() : {}
    const headers = c.req.header()
    return c.json({ message, query, json_body, headers })
  })

  const form : Form = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get: (_key: string) => null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAll: (_key: string) => [],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    has: (_key: string) => false,
    length: 0,
    [Symbol.iterator]: () => {
      return {
        next: () => {
          return {
            done: true,
            value: null,
          }
        },
      }
    },
  }

  const log : Logger = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error: (_message: string) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    warn: (_message: string) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info: (_message: string) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    verbose: (_message: string) => {},
  } as Logger

  const buildRequest = (req : {
    method: HttpMethod, 
    url: string,
    query?: HttpRequestQuery, 
    params?: HttpRequestParams,
    headers?: HttpRequestHeaders, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any,
  }): HttpRequest => {
    return {
      method: req.method,
      url : req.url,
      headers: req.headers ?? {},
      body: req.body ?? null,
      query: req.query ?? {},
      params: {},
      user: null,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      get: (_key: string) => '',
      parseFormBody: () => form,
    }
  }

  const buildContext = (functionName: string): Context => {
    const invocationId = 'test'
    return {
      invocationId,
      executionContext: {
        invocationId,
        functionName: functionName,
        functionDirectory: '/',
        retryContext: null,
      },
      bindings: {},
      bindingData: {
        invocationId,
      },
      bindingDefinitions: [],
      log,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      done: (_err) => {},
      traceContext: {
        traceparent: '',
        tracestate: '',
        attributes: {},
      },
    }
  }

  it('should be able to handle a request', async () => {
    const req = buildRequest({
      method: 'GET', 
      url: 'http://localhost/api/test?foo=bar',
      query: {
        foo: 'bar',
      },
      params: {
        funcname: 'test',
      },
    })
    const context = await handle(app)({context: buildContext('test'), req})
    expect(context.res).not.toBeUndefined()
    expect(context.res?.body).toBeDefined()
    expect(context.res?.body).not.toBeNull()
    expect(context.res?.body).not.toBe('')
    expect(context.res?.body).not.toBeUndefined()
    try {
      const res_json = JSON.parse(context.res?.body)
      expect(res_json).not.toBeUndefined()
      expect(res_json).not.toBeNull()
      expect(res_json).toStrictEqual({
        message: 'Hello, Azure Functions and Hono!',
        query: {
          foo: ['bar'],
        },
        json_body: {},
        headers: {},
      })
    } catch (err) {
      console.error(err)
      expect(err).toBeNull()
    }
  })
})
