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
    const validator = v.json('posts[*].published').asArray().asBoolean().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
    expect(res.value).toEqual([true, true, false])
  })

  it('Should allow nested array paths', async () => {
    const validator = v.json('posts[*].rating[0]').asArray().asBoolean().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
    expect(res.value).toEqual([true, false, true])
  })

  it('Should allow optional array paths', async () => {
    const validator = v.json('posts[*].rating[1]').asArray().isOptional()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
    expect(res.message).toBeUndefined()
    expect(res.value).toEqual(['cool', undefined, 'lame'])
  })

  it('Should provide error with invalid array paths', async () => {
    const validator = v.json('posts[*].rating[3]').asArray()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = [
      'Invalid Value: the JSON body "posts[*].rating[3]" is invalid - [undefined, undefined, undefined]',
    ]
    expect(res.message).toBe(messages.join('\n'))
    expect(res.value).toEqual([undefined, undefined, undefined])
  })

  it('Should prevent invalid types within array', async () => {
    const validator = v.json('posts[*].awesome').asArray().asBoolean()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = [
      'Invalid Value: the JSON body "posts[*].awesome" is invalid - [true, "true", false]',
    ]
    expect(res.message).toBe(messages.join('\n'))
    expect(res.value).toEqual([true, 'true', false])
  })

  it('Should allow undefined values when optional', async () => {
    const validator = v.json('posts[*].testing').asArray().asBoolean().isOptional()
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
      flags: [true, false],
      published: [true],
      comments: [
        {
          title: 'abc',
          author: 'John',
          category: 'Heroes',
          flags: [true, false],
        },
        {
          title: 'def',
          author: 'Dave',
          flags: [false, true],
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
    const validator = v.json('post.comments[*].title').asArray().isAlpha()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
  })

  it('Should return the same result for `.asArray().as{Type}()` and `.as{Type}().asArray()', async () => {
    const validator1 = v.json('post.flags').asArray().asBoolean().isRequired()
    const validator2 = v.json('post.flags').asBoolean().asArray().isRequired()
    const res1 = await validator1.validate(req)
    const res2 = await validator2.validate(req)

    expect(res1.isValid).toBe(true)
    expect(res1.message).toBeUndefined()
    expect(res1.value).toEqual([true, false])

    // Entire responses should be equal
    expect(res1).toEqual(res2)
  })

  it('Should fail validation if value is array but `.asArray()` not called', async () => {
    const validator = v.json('post.flags').asBoolean().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
    const messages = ['Invalid Value: the JSON body "post.flags" is invalid - [true, false]']
    expect(res.message).toBe(messages.join('\n'))
    expect(res.value).toEqual([true, false])
  })

  it('Should pass validation if `isRequired` and path has no missing entries', async () => {
    const validator = v.json('post.comments[*].author').asArray().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
  })

  it('Should fail validation if `isRequired` and missing entry for path', async () => {
    const validator = v.json('post.comments[*].heroes').asArray().isRequired()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(false)
  })
})
