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

describe('Invalid HTTP request handling', () => {
  const v = new Validator()

  it('Should throw malformed error when JSON body absent', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
    })

    let error
    try {
      const validator = v.json('post.title').isRequired()
      await validator.validate(req)
    } catch (e) {
      error = e
    }
    expect(error instanceof Error).toBe(true)
    expect((error as Error).message).toBe('Malformed JSON in request body')
  })

  it('Should throw malformed error when a JSON body is not valid JSON', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      body: 'Not json!',
    })

    let error
    try {
      const validator = v.json('post.title').isRequired()
      await validator.validate(req)
    } catch (e) {
      error = e
    }
    expect(error instanceof Error).toBe(true)
    expect((error as Error).message).toBe('Malformed JSON in request body')
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
    const validator = v.json('post.comments[0].title').isAlpha()
    const res = await validator.validate(req)
    expect(res.isValid).toBe(true)
  })
})

describe('Nested objects', () => {
  const json = {
    posts: [
      {
        id: 123,
        title: 'JavaScript',
        authors: [
          {
            name: 'Superman',
            age: 20,
            like: {
              food: 'fish',
            },
          },
        ],
        tags: [
          {
            name: 'Node.js',
          },
          {
            name: 'Deno',
          },
          {
            name: 'Bun',
          },
        ],
      },
      {
        id: 456,
        title: 'Framework',
        tags: [
          {
            name: 'Hono',
          },
          {
            name: 'Express',
          },
        ],
      },
    ],
    pager: {
      prev: true,
      next: false,
      meta: {
        perPage: 10,
        pages: [
          {
            num: 1,
          },
        ],
      },
    },
  }

  const req = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(json),
  })

  it('Should validate nested array values', async () => {
    const v = new Validator()
    const vArray = v.array('posts', (v) => ({
      id: v.json('id').asNumber(),
      title: v.json('title'),
      authors: v
        .array('authors', (v) => ({
          name: v.json('name'),
          age: v.json('age').asNumber(),
          like: v.object('like', (v) => ({
            food: v.json('food').isRequired(),
          })),
        }))
        .isOptional(),
      tags: v
        .array('tags', (v) => ({
          name: v.json('name'),
        }))
        .isOptional(),
    }))
    for (const validator of vArray.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(true)
      expect(res.message).toBeUndefined()
    }
  })

  it('Should validate nested object values', async () => {
    const v = new Validator()
    const vObject = v.object('pager', (v) => ({
      prev: v.json('prev').asBoolean(),
      next: v.json('next').asBoolean(),
      meta: v.object('meta', (v) => ({
        totalCount: v.json('perPage').asNumber(),
        pages: v.array('pages', (v) => ({
          num: v.json('num').asNumber(),
        })),
      })),
    }))

    for (const validator of vObject.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(true)
      expect(res.message).toBeUndefined()
    }
  })

  it('Should validate nested array values', async () => {
    let v = new Validator()
    const vArray = v.array('posts', (v) => ({
      id: v.json('id'),
    }))

    for (const validator of vArray.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(false)
      const messages = ['Invalid Value: the JSON body "posts.[*].id" is invalid - [123, 456]']
      expect(res.message).toBe(messages.join('\n'))
    }

    v = new Validator()
    const vArray2 = v.array('posts', (v) => ({
      optionalProperty: v.json('optional-property').isOptional(),
    }))
    for (const validator of vArray2.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(true)
      expect(res.message).toBeUndefined()
    }
  })

  it('Should validate nested array values with `isOptional`', async () => {
    const v = new Validator()
    const vArray = v.array('posts', (v) => ({
      title: v.json('optional-title').isOptional(),
      comments: v
        .array('comments', (v) => ({
          body: v.json('body'),
        }))
        .isOptional(),
    }))

    for (const validator of vArray.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(true)
      expect(res.message).toBeUndefined()
    }

    const vArray2 = v
      .array('posts', (v) => ({
        title: v.json('title').asNumber(),
      }))
      .isOptional()

    for (const validator of vArray2.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(false)
      const messages = [
        'Invalid Value: the JSON body "posts.[*].title" is invalid - ["JavaScript", "Framework"]',
      ]
      expect(res.message).toBe(messages.join('\n'))
    }
  })

  it('Should validate nested object values with `isOptional`', async () => {
    const v = new Validator()
    const vObject = v.object('pager', (v) => ({
      current: v.json('optional-value').isOptional(),
      method: v
        .object('method', (v) => ({
          name: v.json('name'),
        }))
        .isOptional(),
    }))

    for (const validator of vObject.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(true)
      expect(res.message).toBeUndefined()
    }
  })

  it('Should only allow `v.json()` in nested array or object', async () => {
    const v = new Validator()
    const vArray = v.array('posts', (v) => ({
      id: v.header('id').asNumber().isRequired(),
    }))

    for (const validator of vArray.getValidators()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(false)
      const messages = ['Invalid Value: the request header "id" is invalid - undefined']
      expect(res.message).toBe(messages.join('\n'))
    }

    const vObject = v.object('pager', (v) => ({
      prev: v.query('prev').asBoolean(),
      next: v.body('next').asBoolean(),
    }))

    const messages = [
      'Invalid Value: the query parameter "prev" is invalid - undefined',
      'Invalid Value: the request body "next" is invalid - undefined',
    ]

    for (const [i, validator] of vObject.getValidators().entries()) {
      const res = await validator.validate(req)
      expect(res.isValid).toBe(false)
      expect(res.message).toBe(`${messages[i]}`)
    }
  })
})
