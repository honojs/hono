import type { Equal, Expect, JSONParsed } from './types'

describe('JSONParsed', () => {
  enum SampleEnum {
    Value1 = 'value1',
    Value2 = 'value2',
  }

  interface Meta {
    metadata: {
      href: string
      sampleEnum: SampleEnum
    }
  }

  interface SampleInterface {
    someMeta: Meta
  }

  type SampleType = {
    someMeta: Meta
  }

  it('Should parse a complex type', () => {
    const sample: JSONParsed<SampleType> = {
      someMeta: {
        metadata: {
          href: '',
          sampleEnum: SampleEnum.Value1,
        },
      },
    }
    expectTypeOf(sample).toEqualTypeOf<SampleType>()
  })

  it('Should parse a complex interface', () => {
    const sample: JSONParsed<SampleInterface> = {
      someMeta: {
        metadata: {
          href: '',
          sampleEnum: SampleEnum.Value1,
        },
      },
    }
    expectTypeOf(sample).toEqualTypeOf<SampleInterface>()
  })

  it('Should convert Date to string', () => {
    type Post = {
      datetime: Date
    }
    type Expected = {
      datetime: string
    }
    type Actual = JSONParsed<Post>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type verify = Expect<Equal<Expected, Actual>>
  })

  it('Should convert bigint to never', () => {
    type Post = {
      num: bigint
    }
    type Expected = {
      num: never
    }
    type Actual = JSONParsed<Post>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type verify = Expect<Equal<Expected, Actual>>
  })
})
