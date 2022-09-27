import { extendRequestPrototype } from '../../request'
import { Validator } from './validator'

extendRequestPrototype()

describe('Basic - query', () => {
  const v = new Validator()

  const req = new Request('http://localhost/?q=foo&page=3')

  it('Should be valid - page', async () => {
    const validator = v.query('page').trim().isNumeric()
    expect(validator.type).toBe('string')
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
  })

  it('Should be invalid - q', async () => {
    const validator = v.query('q').isRequired().asNumber()
    expect(validator.type).toBe('number')
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the query parameter "q" is invalid - foo']
    expect(res.message).toBe(messages.join('\n'))
  })

  it('Should be invalid - q2', async () => {
    const validator = v.query('q2').isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the query parameter "q2" is invalid - undefined']
    expect(res.message).toBe(messages.join('\n'))
  })
})

describe('Basic - header', () => {
  const v = new Validator()

  const req = new Request('http://localhost/', {
    headers: {
      'x-message': 'hello world!',
      'x-number': '12345',
    },
  })

  it('Should be valid - x-message', async () => {
    const validator = v.header('x-message').isRequired().contains('Hello', { ignoreCase: true })
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
  })

  it('Should be invalid - x-number', async () => {
    const validator = v.header('x-number').isEqual(12345)
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the request header "x-number" is invalid - 12345']
    expect(res.message).toBe(messages.join('\n'))
  })
})

describe('Basic - body', () => {
  const v = new Validator()

  const body = new FormData()
  body.append('title', '  abcdef ')
  body.append('title2', 'abcdef')
  const req = new Request('http://localhost/', {
    method: 'POST',
    body: body,
  })

  it('Should be valid - title', async () => {
    const validator = v.body('title').trim().isLength({ max: 10 }).isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
  })

  it('Should be invalid - title2', async () => {
    const validator = v.body('title2').isLength({ max: 5 })
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the request body "title2" is invalid - abcdef']
    expect(res.message).toBe(messages.join('\n'))
  })
})

describe('Basic - JSON', () => {
  const v = new Validator()

  const post = {
    id: 1234,
    title: 'This is title',
    author: {
      name: 'Superman',
      age: 20,
    },
  }

  const req = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(post),
  })

  it('Should be valid - id', async () => {
    const validator = v.json('id').asNumber().isEqual(1234)
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
  })

  it('Should be valid - author.name', async () => {
    const validator = v.json('author.name').isIn(['Ultra man', 'Superman'])
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
  })

  it('Should be invalid - author.age', async () => {
    const validator = v.json('author.age').asNumber().isLte(10)
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the JSON body "author.age" is invalid - 20']
    expect(res.message).toBe(messages.join('\n'))
  })
})

describe('Handle optional values', () => {
  const v = new Validator()

  const req = new Request('http://localhost/', {
    method: 'POST',
  })

  it('Should be valid - `comment` is optional', async () => {
    const validator = v.body('comment').isOptional()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
  })
})

describe('Handling types error', () => {
  const v = new Validator()

  const post = {
    id: '1234',
    title: 'This is title',
    published: 'true',
  }

  const req = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(post),
  })

  it('Should be invalid - "1234" is not number', async () => {
    const validator = v.json('id').asNumber().isEqual(1234)
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the JSON body "id" is invalid - 1234']
    expect(res.message).toBe(messages.join('\n'))
  })

  it('Should be invalid - "true" is not boolean', async () => {
    const validator = v.json('published').asBoolean()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the JSON body "published" is invalid - true']
    expect(res.message).toBe(messages.join('\n'))
  })
})
