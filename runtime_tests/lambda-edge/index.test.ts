import { handle } from '../../src/adapter/lambda-edge/handler'
import { Hono } from '../../src/hono'
import { basicAuth } from '../../src/middleware/basic-auth'

describe('Lambda@Edge Adapter for Hono', () => {
  const app = new Hono()

  app.get('/', (c) => {
    return c.text('Hello Lambda!')
  })

  app.get('/binary', (c) => {
    return c.body('Fake Image', 200, {
      'Content-Type': 'image/png',
    })
  })

  app.post('/post', async (c) => {
    const body = (await c.req.parseBody()) as { message: string }
    return c.text(body.message)
  })

  const username = 'hono-user-a'
  const password = 'hono-password-a'
  app.use('/auth/*', basicAuth({ username, password }))
  app.get('/auth/abc', (c) => c.text('Good Night Lambda!'))

  const handler = handle(app)

  it('Should handle a CloudFrontEdgeEvent and return a CloudFrontResult with a 200 response', async () => {
    const event = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'example.com',
              distributionId: 'EXAMPLE123',
              eventType: 'viewer-request',
              requestId: 'exampleRequestId',
            },
            request: {
              clientIp: '123.123.123.123',
              headers: {
                'content-type': [
                  {
                    key: 'Content-Type',
                    value: 'text/plain',
                  },
                ],
              },
              method: 'GET',
              querystring: '',
              uri: '/',
            },
          },
        },
      ],
    };
  
    const response = await handler(event); // Assuming handle is the function being tested
    
    expect(response.status).toBe('200');
    expect(response.body).toBe('Hello Lambda!');
    expect(response.headers['content-type'][0].value).toMatch(/^text\/plain/);
  });  

  it('Should handle a GET request and return a 200 response with binary', async () => {
    const event = {
      httpMethod: 'GET',
      headers: {},
      path: '/binary',
      body: null,
      isBase64Encoded: false,
      requestContext: {
        domainName: 'example.com',
      },
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('RmFrZSBJbWFnZQ==')
    expect(response.headers['content-type']).toMatch(/^image\/png/)
    expect(response.isBase64Encoded).toBe(true)
  })

  it('Should handle a GET request and return a 404 response', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { 'content-type': 'text/plain' },
      path: '/nothing',
      body: null,
      isBase64Encoded: false,
      requestContext: {
        domainName: 'example.com',
      },
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(404)
  })

  it('Should handle a POST request and return a 200 response', async () => {
    const searchParam = new URLSearchParams()
    searchParam.append('message', 'Good Morning Lambda!')
    const event = {
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      path: '/post',
      body: btoa(searchParam.toString()),
      isBase64Encoded: true,
      requestContext: {
        domainName: 'example.com',
      },
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Good Morning Lambda!')
  })

  it('Should handle a request and return a 401 response with Basic auth', async () => {
    const event = {
      httpMethod: 'GET',
      headers: {
        'Content-Type': 'plain/text',
      },
      path: '/auth/abc',
      body: null,
      isBase64Encoded: true,
      requestContext: {
        domainName: 'example.com',
      },
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(401)
  })

  it('Should handle a request and return a 200 response with Basic auth', async () => {
    const credential = 'aG9uby11c2VyLWE6aG9uby1wYXNzd29yZC1h'
    const event = {
      httpMethod: 'GET',
      headers: {
        'Content-Type': 'plain/text',
        Authorization: `Basic ${credential}`,
      },
      path: '/auth/abc',
      body: null,
      isBase64Encoded: true,
      requestContext: {
        domainName: 'example.com',
      },
    }

    const response = await handler(event)
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('Good Night Lambda!')
  })
})
