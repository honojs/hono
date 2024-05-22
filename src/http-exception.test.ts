import { HTTPException } from './http-exception'

describe('HTTPException', () => {
  it('Should be 401 HTTP exception object', async () => {
    // We should throw an exception if is not authorized
    // because next handlers should not be fired.
    const exception = new HTTPException(401, {
      message: 'Unauthorized',
    })
    const res = exception.getResponse()

    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
    expect(exception.status).toBe(401)
    expect(exception.message).toBe('Unauthorized')
  })

  it('Should be accessible to the object causing the exception', async () => {
    // We should pass the cause of the error to the cause option
    // because it makes debugging easier.
    const error = new Error('Server Error')
    const exception = new HTTPException(500, {
      message: 'Internal Server Error',
      cause: error,
    })
    const res = exception.getResponse()

    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Internal Server Error')
    expect(exception.status).toBe(500)
    expect(exception.message).toBe('Internal Server Error')
    expect(exception.cause).toBe(error)
  })

  it('Should prioritize the status code over the code in the response', async () => {
    const exception = new HTTPException(400, {
      res: new Response('An exception', {
        status: 200,
      }),
    })
    const res = exception.getResponse()
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('An exception')
  })
})
