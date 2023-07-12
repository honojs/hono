import { HTTPException } from './http-exception'

describe('HTTPFatalError', () => {
  it('Should be 401 HTTP exception object', () => {
    // We should throw an exception if is not authorized
    // because next handlers should not be fired.
    const exception = new HTTPException(401, {
      message: 'Unauthorized',
    })
    expect(exception.status).toBe(401)
    expect(exception.message).toBe('Unauthorized')
    const res = exception.getResponse()
    expect(res.status).toBe(401)
  })
})
