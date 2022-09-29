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

describe('Handle required values', () => {
  const v = new Validator()

  const req = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify({ comment: null, name: 'John', admin: false }),
  })

  it('Should be valid - `name` is required', async () => {
    const validator = v.json('name').isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
  })

  it('Should be invalid - `comment` is required but missing', async () => {
    const validator = v.json('comment').isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
  })

  it('Should be valid - `admin` is required and present, although falsey', async () => {
    const validator = v.json('admin').asBoolean().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.value).toBe(false)
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

describe('Handle array paths', () => {
  const v = new Validator()

  const body = {
    posts: [
      {
        id: 12411,
        title: 'This is title #1',
        published: true,
        rating: [true, 'cool'],
        awesome: true,
        testing: false,
      },
      {
        id: 12412,
        title: 'This is title #2',
        published: true,
        rating: [false],
        awesome: 'true',
        testing: true,
      },
      {
        id: 12413,
        title: 'This is title #3',
        published: false,
        rating: [true, 'lame'],
        awesome: false,
      },
    ],
  }

  const req = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  it('Should validate targeted path in array', async () => {
    const validator = v.json('posts[*].published').asBoolean().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
    expect(res.value).toEqual([true, true, false])
  })

  it('Should allow nested array paths', async () => {
    const validator = v.json('posts[*].rating[0]').asBoolean().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
    expect(res.value).toEqual([true, false, true])
  })

  it('Should allow optional array paths', async () => {
    const validator = v.json('posts[*].rating[1]').isOptional()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
    expect(res.value).toEqual(['cool', undefined, 'lame'])
  })

  it('Should provide error with invalid array paths', async () => {
    const validator = v.json('posts[*].rating[3]')
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = [
      'Invalid Value: the JSON body "posts[*].rating[3]" is invalid - [undefined, undefined, undefined]',
    ]
    expect(res.message).toBe(messages.join('\n'))
    expect(res.value).toEqual([undefined, undefined, undefined])
  })

  it('Should prevent invalid types within array', async () => {
    const validator = v.json('posts[*].awesome').asBoolean()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = [
      'Invalid Value: the JSON body "posts[*].awesome" is invalid - [true, "true", false]',
    ]
    expect(res.message).toBe(messages.join('\n'))
    expect(res.value).toEqual([true, 'true', false])
  })

  it('Should allow undefined values when optional', async () => {
    const validator = v.json('posts[*].testing').asBoolean().isOptional()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.value).toEqual([false, true, undefined])
  })
})

describe('Validate with asArray', () => {
  const v = new Validator()
  const json = {
    post: {
      title: ['Hello'],
      comment: [
        {
          title: 'abc',
        },
        {
          title: 'def',
        },
      ],
    },
  }

  const req = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(json),
  })

  it('Should validate array values', async () => {
    const validator = v.json('post.title').asArray().isAlpha()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
  })
  it('Should validate array values - specify with `*`', async () => {
    const validator = v.json('post.comment[*].title').asArray().isAlpha()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
  })
})
