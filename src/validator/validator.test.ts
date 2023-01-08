import { HonoRequest } from '../request'
import { Validator } from './validator'

describe('Basic - query', () => {
  const v = new Validator()

  const rawRequest = new Request('http://localhost/?q=foo&page=3')
  const req = new HonoRequest(rawRequest)

  it('Should be valid - page', async () => {
    const validator = v.query('page').trim().isNumeric()
    expect(validator.type).toBe('string')
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
  })

  it('Should be invalid - q', async () => {
    const validator = v.query('q').isRequired().asNumber()
    expect(validator.type).toBe('number')
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    const messages = [
      'Invalid Value [foo]: the query parameter "q" is invalid - should be "number"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
  })

  it('Should be invalid - q2', async () => {
    const validator = v.query('q2').isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    let messages = [
      'Invalid Value [undefined]: the query parameter "q2" is invalid - should be "string"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
    expect(results[1].isValid).toBe(false)
    messages = ['Invalid Value [undefined]: the query parameter "q2" is invalid - isRequired']
    expect(results[1].message).toBe(messages.join('\n'))
  })
})

describe('Basic - queries', () => {
  const v = new Validator()

  const rawRequest = new Request('http://localhost/?tag=foo&tag=bar&id=123&id=456')
  const req = new HonoRequest(rawRequest)

  it('Should be valid - tag', async () => {
    const validator = v.queries('tag').isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[0].value).toEqual(['foo', 'bar'])
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
  })

  it('Should be invalid - ids', async () => {
    const validator = v.queries('ids').isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(false)
    expect(results[1].message).toBe(
      'Invalid Value []: the query parameters "ids" is invalid - isRequired'
    )
  })

  it('Should be valid - id', async () => {
    const validator = v.queries('id').isNumeric()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
  })

  it('Should be valid - comment is options', async () => {
    const validator = v.queries('comment').isOptional()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
  })
})

describe('Basic - header', () => {
  const v = new Validator()

  const rawRequest = new Request('http://localhost/', {
    headers: {
      'x-message': 'hello world!',
      'x-number': '12345',
    },
  })

  const req = new HonoRequest(rawRequest)

  it('Should be valid - x-message', async () => {
    const validator = v.header('x-message').isRequired().contains('Hello', { ignoreCase: true })
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
    expect(results[2].isValid).toBe(true)
    expect(results[2].message).toBeUndefined()
  })

  it('Should be invalid - x-number', async () => {
    const validator = v.header('x-number').isEqual(12345)
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(false)
    const messages = ['Invalid Value [12345]: the request header "x-number" is invalid - isEqual']
    expect(results[1].message).toBe(messages.join('\n'))
  })
})

describe('Basic - body', () => {
  const v = new Validator()

  const body = new FormData()
  body.append('title', '  abcdef ')
  body.append('title2', 'abcdef')
  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: body,
  })

  const req = new HonoRequest(rawRequest)

  it('Should be valid - title', async () => {
    const validator = v.body('title').trim().isLength({ max: 10 }).isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
    expect(results[2].isValid).toBe(true)
    expect(results[2].message).toBeUndefined()
  })

  it('Should be invalid - title2', async () => {
    const validator = v.body('title2').isLength({ max: 5 })
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(false)
    const messages = ['Invalid Value [abcdef]: the request body "title2" is invalid - isLength']
    expect(results[1].message).toBe(messages.join('\n'))
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

  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(post),
  })
  const req = new HonoRequest(rawRequest)

  it('Should be valid - id', async () => {
    const validator = v.json('id').asNumber().isEqual(1234)
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
  })

  it('Should be valid - author.name', async () => {
    const validator = v.json('author.name').isIn(['Ultra man', 'Superman'])
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].message).toBeUndefined()
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
  })

  it('Should be invalid - author.age', async () => {
    const validator = v.json('author.age').asNumber().isLte(10)
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(false)
    const messages = ['Invalid Value [20]: the JSON body "author.age" is invalid - isLte']
    expect(results[1].message).toBe(messages.join('\n'))
  })
})

describe('Handle required values', () => {
  const v = new Validator()

  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify({ comment: null, name: 'John', admin: false }),
  })
  const req = new HonoRequest(rawRequest)

  it('Should be valid - `name` is required', async () => {
    const validator = v.json('name').isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
  })

  it('Should be invalid - `comment` is required but missing', async () => {
    const validator = v.json('comment').isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    expect(results[1].isValid).toBe(false)
  })

  it('Should be valid - `admin` is required and present, although falsy', async () => {
    const validator = v.json('admin').asBoolean().isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
    expect(results[1].value).toBe(false)
  })
})

describe('Handle optional values', () => {
  it('Should be valid - `comment` is optional', async () => {
    const v = new Validator()
    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
    })
    const req = new HonoRequest(rawRequest)
    const validator = v.body('comment').isOptional()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
  })
  it('Should be valid - "isNumeric" but "isOptional"', async () => {
    const v = new Validator()
    const validator = v.query('page').isNumeric().isOptional()
    const rawRequest = new Request('http://localhost/')
    const req = new HonoRequest(rawRequest)
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
  })
})

describe('Handling types error', () => {
  const v = new Validator()

  const post = {
    id: '1234',
    title: 'This is title',
    published: 'true',
  }

  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(post),
  })
  const req = new HonoRequest(rawRequest)

  it('Should be invalid - "1234" is not number', async () => {
    const validator = v.json('id').asNumber().isEqual(1234)
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    const messages = ['Invalid Value [1234]: the JSON body "id" is invalid - should be "number"']
    expect(results[0].message).toBe(messages.join('\n'))
  })

  it('Should be invalid - "true" is not boolean', async () => {
    const validator = v.json('published').asBoolean()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    const messages = [
      'Invalid Value [true]: the JSON body "published" is invalid - should be "boolean"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
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

  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const req = new HonoRequest(rawRequest)

  it('Should validate targeted path in array', async () => {
    const validator = v.json('posts[*].published').asArray().asBoolean().isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
    expect(results[1].value).toEqual([true, true, false])
  })

  it('Should allow nested array paths', async () => {
    const validator = v.json('posts[*].rating[0]').asArray().asBoolean().isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
    expect(results[1].value).toEqual([true, false, true])
  })

  it('Should allow optional array paths', async () => {
    const validator = v.json('posts[*].rating[1]').asArray().isOptional()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
    expect(results[1].message).toBeUndefined()
    expect(results[1].value).toEqual(['cool', undefined, 'lame'])
  })

  it('Should provide error with invalid array paths', async () => {
    const validator = v.json('posts[*].rating[3]').asArray()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    const messages = [
      'Invalid Value [undefined, undefined, undefined]: the JSON body "posts[*].rating[3]" is invalid - should be "string[]"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
    expect(results[0].value).toEqual([undefined, undefined, undefined])
  })

  it('Should prevent invalid types within array', async () => {
    const validator = v.json('posts[*].awesome').asArray().asBoolean()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    const messages = [
      'Invalid Value [true, "true", false]: the JSON body "posts[*].awesome" is invalid - should be "boolean[]"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
    expect(results[0].value).toEqual([true, 'true', false])
  })

  it('Should allow undefined values when optional', async () => {
    const validator = v.json('posts[*].testing').asArray().asBoolean().isOptional()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[0].value).toEqual([false, true, undefined])
  })
  ;[undefined, []].forEach((value) => {
    it(`Should allow ${
      value === undefined ? 'undefined' : 'empty'
    } arrays when optional`, async () => {
      const rawRequest = new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({
          blog: {
            ...(value === undefined ? {} : { posts: [] }),
          },
        }),
      })
      const req = new HonoRequest(rawRequest)
      const vObject = v.object('blog', (v) => ({
        posts: v
          .array('posts', (v) => ({
            id: v.json('id').asNumber().isOptional(),
            title: v.json('title').isOptional(),
            author: v
              .object('author', (v) => ({
                name: v.json('name'),
              }))
              .isOptional(),
          }))
          .isOptional(),
        highlightedPostId: v.json('highlightedPostId').asNumber(),
      }))
      for (const validator of vObject.getValidators()) {
        const results = await validator.validate(req)
        expect(results[0].isValid).toBe(true)
        expect(results[0].message).toBeUndefined()
      }
    })
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
    pager: {
      prev: true,
    },
  }

  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(json),
  })
  const req = new HonoRequest(rawRequest)

  it('Should validate array values', async () => {
    const validator = v.json('post.title').asArray().isAlpha()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
  })

  it('Should validate array values - specify with `*`', async () => {
    const validator = v.json('post.comments[*].title').asArray().isAlpha()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
  })

  it('Should return the same result for `.asArray().as{Type}()` and `.as{Type}().asArray()', async () => {
    const validator1 = v.json('post.flags').asArray().asBoolean().isRequired()
    const validator2 = v.json('post.flags').asBoolean().asArray().isRequired()
    const res1 = await validator1.validate(req)
    const res2 = await validator2.validate(req)

    expect(res1[0].isValid).toBe(true)
    expect(res1[0].message).toBeUndefined()
    expect(res1[0].value).toEqual([true, false])
    expect(res1[1].isValid).toBe(true)

    // Entire responses should be equal
    expect(res1).toEqual(res2)
  })

  it('Should fail validation if value is array but `.asArray()` not called', async () => {
    const validator = v.json('post.flags').asBoolean().isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    const messages = [
      'Invalid Value [true, false]: the JSON body "post.flags" is invalid - should be "boolean"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
    expect(results[0].value).toEqual([true, false])
    expect(results[1].isValid).toBe(true)
  })

  it('Should pass validation if `isRequired` and path has no missing entries', async () => {
    const validator = v.json('post.comments[*].author').asArray().isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
  })

  it('Should fail validation if `isRequired` and missing entry for path', async () => {
    const validator = v.json('post.comments[*].heroes').asArray().isRequired()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    let messages = [
      'Invalid Value [undefined, undefined]: the JSON body "post.comments[*].heroes" is invalid - should be "string[]"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
    expect(results[1].isValid).toBe(false)
    messages = [
      'Invalid Value [undefined, undefined]: the JSON body "post.comments[*].heroes" is invalid - isRequired',
    ]
    expect(results[1].message).toBe(messages.join('\n'))
  })

  it('Should fail validation if value is not array but `asArray` is set', async () => {
    const validator = v.json('pager.prev').asBoolean().asArray()
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    const messages = [
      'Invalid Value [true]: the JSON body "pager.prev" is invalid - should be "boolean[]"',
    ]
    expect(results[0].message).toBe(messages.join('\n'))
  })
})

describe('Invalid HTTP request handling', () => {
  const v = new Validator()

  it('Should throw malformed error when JSON body absent', async () => {
    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
    })
    const req = new HonoRequest(rawRequest)

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
    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
      body: 'Not json!',
    })
    const req = new HonoRequest(rawRequest)

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

  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(json),
  })
  const req = new HonoRequest(rawRequest)

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
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(true)
      expect(results[0].message).toBeUndefined()
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
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(true)
      expect(results[0].message).toBeUndefined()
    }
  })

  it('Should validate nested array values', async () => {
    let v = new Validator()
    const vArray = v.array('posts', (v) => ({
      id: v.json('id'),
    }))

    for (const validator of vArray.getValidators()) {
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(false)
      const messages = [
        'Invalid Value [123, 456]: the JSON body "posts.[*].id" is invalid - should be "string[]"',
      ]
      expect(results[0].message).toBe(messages.join('\n'))
    }

    v = new Validator()
    const vArray2 = v.array('posts', (v) => ({
      optionalProperty: v.json('optional-property').isOptional(),
    }))
    for (const validator of vArray2.getValidators()) {
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(true)
      expect(results[0].message).toBeUndefined()
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
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(true)
      expect(results[0].message).toBeUndefined()
    }

    const vArray2 = v
      .array('posts', (v) => ({
        title: v.json('title').asNumber(),
      }))
      .isOptional()

    for (const validator of vArray2.getValidators()) {
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(false)
      const messages = [
        'Invalid Value ["JavaScript", "Framework"]: the JSON body "posts.[*].title" is invalid - should be "number[]"',
      ]
      expect(results[0].message).toBe(messages.join('\n'))
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
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(true)
      expect(results[0].message).toBeUndefined()
    }
  })

  it('Should only allow `v.json()` in nested array or object', async () => {
    const v = new Validator()
    const vArray = v.array('posts', (v) => ({
      id: v.header('id').asNumber().isRequired(),
    }))

    for (const validator of vArray.getValidators()) {
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(false)
      const messages = [
        'Invalid Value [undefined]: the request header "id" is invalid - should be "number"',
      ]
      expect(results[0].message).toBe(messages.join('\n'))
    }

    const vObject = v.object('pager', (v) => ({
      prev: v.query('prev').asBoolean(),
      next: v.body('next').asBoolean(),
    }))

    const messages = [
      'Invalid Value [undefined]: the query parameter "prev" is invalid - should be "boolean"',
      'Invalid Value [undefined]: the request body "next" is invalid - should be "boolean"',
    ]

    for (const [i, validator] of vObject.getValidators().entries()) {
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(false)
      expect(results[0].message).toBe(`${messages[i]}`)
    }
  })

  const blogJson = {
    blog: {
      totalPosts: '3',
      meta: {
        foo: {
          bar: 'test',
        },
      },
      posts: [
        {
          id: 123,
          title: 'JavaScript',
          author: {
            name: 'foo',
          },
          publisher: {
            name: 'Foo',
          },
        },
        {
          id: '456',
          title: 'Framework',
          author: {
            name: 'bar',
          },
          publisher: {
            name: 'Bar',
          },
        },
        {
          id: 789,
          title: 'Hono',
          author: {
            name: 'baz',
          },
          publisher: {
            name: 'Baz',
          },
        },
      ],
      highlightedPostId: '123',
    },
  }

  it('Should threat `v.json()` as a nested array type only inside an array', async () => {
    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify(blogJson),
    })
    const req = new HonoRequest(rawRequest)

    const v = new Validator()
    const vObject = v.object('blog', (v) => ({
      totalPosts: v.json('totalPosts').asNumber(),
      posts: v.array('posts', (v) => ({
        id: v.json('id').asNumber(),
        title: v.json('title'),
        author: v.object('author', (v) => ({
          name: v.json('name'),
        })),
      })),
      highlightedPostId: v.json('highlightedPostId').asNumber(),
    }))

    const validators = vObject.getValidators()

    const totalPostsResult = await validators[0].validate(req)
    expect(totalPostsResult[0].isValid).toBe(false)
    expect(totalPostsResult[0].message).toBe(
      'Invalid Value [3]: the JSON body "blog.totalPosts" is invalid - should be "number"'
    )

    const postsIdResult = await validators[1].validate(req)
    expect(postsIdResult[0].isValid).toBe(false)
    expect(postsIdResult[0].message).toBe(
      'Invalid Value [123, "456", 789]: the JSON body "blog.posts.[*].id" is invalid - should be "number[]"'
    )

    const postsTitleResult = await validators[2].validate(req)
    expect(postsTitleResult[0].isValid).toBe(true)

    const postAuthorResult = await validators[3].validate(req)
    expect(postAuthorResult[0].isValid).toBe(true)

    const highlightedPostResult = await validators[4].validate(req)
    expect(highlightedPostResult[0].isValid).toBe(false)
    expect(highlightedPostResult[0].message).toBe(
      'Invalid Value [123]: the JSON body "blog.highlightedPostId" is invalid - should be "number"'
    )
  })

  it('Should correctly handle sequences of nested objects inside an array', async () => {
    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify(blogJson),
    })
    const req = new HonoRequest(rawRequest)

    const v = new Validator()
    const vObject = v.object('blog', (v) => ({
      posts: v.array('posts', (v) => ({
        author: v.object('author', (v) => ({
          name: v.json('name'),
        })),
        publisher: v.object('publisher', (v) => ({
          name: v.json('name'),
        })),
      })),
    }))

    for (const validator of vObject.getValidators()) {
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(true)
      expect(results[0].message).toBeUndefined()
    }
  })

  it('Should correctly handle values inside objects and arrays', async () => {
    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify(blogJson),
    })
    const req = new HonoRequest(rawRequest)

    const v = new Validator()
    const vObject = v.object('blog', (v) => ({
      meta: v.object('meta', (v) => ({
        foo: v.object('foo', (v) => ({
          bar: v.json('bar'),
        })),
      })),
      posts: v.array('posts', (v) => ({
        author: v.object('author', (v) => ({
          name: v.json('name'),
        })),
      })),
    }))
    for (const validator of vObject.getValidators()) {
      const results = await validator.validate(req)
      expect(results[0].isValid).toBe(true)
      expect(results[0].message).toBeUndefined()
    }
  })
})

describe('Custom message', () => {
  const v = new Validator()

  const json = {
    title: 'foo',
    post: [
      {
        id: 123,
      },
    ],
  }

  const rawRequest = new Request('http://localhost/', {
    method: 'POST',
    body: JSON.stringify(json),
  })
  const req = new HonoRequest(rawRequest)

  it('Should return custom error message - value', async () => {
    const customMessage1 = 'Custom message: not contain!'
    const customMessage2 = 'Custom message: not numeric!'
    const validator = v
      .json('title')
      .contains('bar')
      .message([customMessage1].join('\n'))
      .isNumeric()
      .message([customMessage2].join('\n'))
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(false)
    expect(results[1].message).toBe([customMessage1].join('\n'))
    expect(results[2].isValid).toBe(false)
    expect(results[2].message).toBe([customMessage2].join('\n'))
  })

  it('Should return custom error message - validate type', async () => {
    const customMessage = 'Custom message: not string array!'
    const validator = v.json('post[*].id').message([customMessage].join('\n'))
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(false)
    expect(results[0].message).toBe([customMessage].join('\n'))
  })
})

describe('Custom rule', () => {
  const v = new Validator()
  const validator = v.body('screenName').addRule('should be screen name', (value) => {
    if (typeof value === 'string') {
      return /^[0-9a-zA-Z\_]+$/.test(value)
    }
    return false
  })

  it('Should be valid - custom rule', async () => {
    const body = new FormData()
    body.append('screenName', 'honojs_honojs_honojs_honojs_honojs')

    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
      body: body,
    })
    const req = new HonoRequest(rawRequest)
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(true)
  })

  it('Should be invalid - custom rule', async () => {
    const body = new FormData()
    body.append('screenName', 'honojs+honojs')

    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
      body: body,
    })
    const req = new HonoRequest(rawRequest)
    const results = await validator.validate(req)
    expect(results[0].isValid).toBe(true)
    expect(results[1].isValid).toBe(false)
    expect(results[1].message).toBe(
      [
        'Invalid Value [honojs+honojs]: the request body "screenName" is invalid - should be screen name',
      ].join('\n')
    )
  })
})

describe('Sanitizer', () => {
  describe('built-in', () => {
    test('trim', async () => {
      const v = new Validator()

      const post = { name: ' a bc ' }

      const rawRequest = new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify(post),
      })
      const req = new HonoRequest(rawRequest)

      const validator = v.json('name').trim()
      const [result] = await validator.validate(req)

      expect(result.value).toBe('a bc')
    })
  })

  test('custom', async () => {
    const v = new Validator()

    const post = { name: ' a bc ' }

    const rawRequest = new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify(post),
    })
    const req = new HonoRequest(rawRequest)

    const validator = v
      .json('name')
      .addSanitizer((s: unknown) => `${s}`.replace(/\s/g, ''))
      .addSanitizer((s: unknown) => `${s}`.toUpperCase())

    const [results] = await validator.validate(req)

    expect(results.value).toBe('ABC')
  })
})
