import {
  isValidAttributeName,
  isValidTagName,
  normalizeIntrinsicElementKey,
  styleObjectForEach,
} from './utils'

describe('normalizeIntrinsicElementKey', () => {
  test.each`
    key                | expected
    ${'className'}     | ${'class'}
    ${'htmlFor'}       | ${'for'}
    ${'crossOrigin'}   | ${'crossorigin'}
    ${'httpEquiv'}     | ${'http-equiv'}
    ${'itemProp'}      | ${'itemprop'}
    ${'fetchPriority'} | ${'fetchpriority'}
    ${'noModule'}      | ${'nomodule'}
    ${'formAction'}    | ${'formaction'}
    ${'href'}          | ${'href'}
  `('should convert $key to $expected', ({ key, expected }) => {
    expect(normalizeIntrinsicElementKey(key)).toBe(expected)
  })
})

describe('isValidAttributeName', () => {
  test.each`
    name
    ${'class'}
    ${'id'}
    ${'href'}
    ${'data-foo'}
    ${'aria-label'}
    ${'onclick'}
    ${'viewBox'}
    ${'xml:lang'}
  `('should return true for valid name "$name"', ({ name }) => {
    expect(isValidAttributeName(name)).toBe(true)
  })

  test.each`
    name                             | description
    ${''}                            | ${'empty string'}
    ${'" onfocus="alert(1)'}         | ${'double quote'}
    ${"' onfocus='alert(1)"}         | ${'single quote'}
    ${'foo<bar'}                     | ${'less than'}
    ${'"><script>alert(1)</script>'} | ${'greater than'}
    ${'foo bar'}                     | ${'space'}
    ${'foo=bar'}                     | ${'equals sign'}
    ${'foo/bar'}                     | ${'slash'}
    ${'foo\\bar'}                    | ${'backslash'}
    ${'foo`bar'}                     | ${'backtick'}
    ${'a\x00b'}                      | ${'null byte'}
    ${'a\x1fb'}                      | ${'control character'}
    ${'a\x7fb'}                      | ${'DEL character'}
  `('should return false for "$description"', ({ name }) => {
    expect(isValidAttributeName(name)).toBe(false)
  })

  test.each`
    name            | description
    ${'xlink:href'} | ${'namespace separator'}
    ${'data.foo'}   | ${'dot'}
    ${'data_foo'}   | ${'underscore'}
    ${'é'}          | ${'non-ascii'}
  `('should return true for valid "$description" names', ({ name }) => {
    expect(isValidAttributeName(name)).toBe(true)
  })

  it('should keep validating names after the valid attribute name cache is reset', () => {
    for (let i = 0; i < 1025; i++) {
      expect(isValidAttributeName(`data-k${i}`)).toBe(true)
    }

    expect(isValidAttributeName('class')).toBe(true)
    expect(isValidAttributeName('" onfocus="alert(1)')).toBe(false)
  })
})

describe('isValidTagName', () => {
  test.each`
    name
    ${''}
    ${'div'}
    ${'h1'}
    ${'custom-element'}
    ${'clipPath'}
    ${'foo:bar'}
    ${'x.foo'}
    ${'x_bar'}
    ${'é'}
  `('should return true for valid tag name "$name"', ({ name }) => {
    expect(isValidTagName(name)).toBe(true)
  })

  test.each`
    name                             | description
    ${'foo bar'}                     | ${'space'}
    ${'foo\nbar'}                    | ${'newline'}
    ${'" onfocus="alert(1)'}         | ${'double quote'}
    ${"' onfocus='alert(1)"}         | ${'single quote'}
    ${'foo<bar'}                     | ${'less than'}
    ${'"><script>alert(1)</script>'} | ${'greater than'}
    ${'foo=bar'}                     | ${'equals sign'}
    ${'foo/bar'}                     | ${'slash'}
    ${'foo\\bar'}                    | ${'backslash'}
    ${'foo`bar'}                     | ${'backtick'}
    ${'a\x00b'}                      | ${'null byte'}
    ${'a\x1fb'}                      | ${'control character'}
    ${'a\x7fb'}                      | ${'DEL character'}
    ${'!'}                           | ${'single bang'}
    ${'!--'}                         | ${'parser-control bang prefix'}
    ${'!DOCTYPE'}                    | ${'doctype-like name'}
    ${'?'}                           | ${'single question mark'}
    ${'?xml'}                        | ${'processing instruction'}
  `('should return false for "$description"', ({ name }) => {
    expect(isValidTagName(name)).toBe(false)
  })

  it('should keep validating names after the valid tag name cache is reset', () => {
    for (let i = 0; i < 257; i++) {
      expect(isValidTagName(`custom-${i}`)).toBe(true)
    }

    expect(isValidTagName('div')).toBe(true)
    expect(isValidTagName('div onmouseover="alert(1)"')).toBe(false)
  })
})

describe('styleObjectForEach', () => {
  describe('Should output the number as it is, when a number type is passed', () => {
    test.each`
      property
      ${'animationIterationCount'}
      ${'aspectRatio'}
      ${'borderImageOutset'}
      ${'borderImageSlice'}
      ${'borderImageWidth'}
      ${'columnCount'}
      ${'columns'}
      ${'flex'}
      ${'flexGrow'}
      ${'flexPositive'}
      ${'flexShrink'}
      ${'flexNegative'}
      ${'flexOrder'}
      ${'gridArea'}
      ${'gridRow'}
      ${'gridRowEnd'}
      ${'gridRowSpan'}
      ${'gridRowStart'}
      ${'gridColumn'}
      ${'gridColumnEnd'}
      ${'gridColumnSpan'}
      ${'gridColumnStart'}
      ${'fontWeight'}
      ${'lineClamp'}
      ${'lineHeight'}
      ${'opacity'}
      ${'order'}
      ${'orphans'}
      ${'scale'}
      ${'tabSize'}
      ${'widows'}
      ${'zIndex'}
      ${'zoom'}
      ${'fillOpacity'}
      ${'floodOpacity'}
      ${'stopOpacity'}
      ${'strokeDasharray'}
      ${'strokeDashoffset'}
      ${'strokeMiterlimit'}
      ${'strokeOpacity'}
      ${'strokeWidth'}
    `('$property', ({ property }) => {
      const fn = vi.fn()
      styleObjectForEach({ [property]: 1 }, fn)
      expect(fn).toBeCalledWith(
        property.replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`),
        '1'
      )
    })
  })
  describe('Should output with px suffix, when a number type is passed', () => {
    test.each`
      property
      ${'borderBottomWidth'}
      ${'borderLeftWidth'}
      ${'borderRightWidth'}
      ${'borderTopWidth'}
      ${'borderWidth'}
      ${'bottom'}
      ${'fontSize'}
      ${'height'}
      ${'left'}
      ${'margin'}
      ${'marginBottom'}
      ${'marginLeft'}
      ${'marginRight'}
      ${'marginTop'}
      ${'padding'}
      ${'paddingBottom'}
      ${'paddingLeft'}
      ${'paddingRight'}
      ${'paddingTop'}
      ${'right'}
      ${'top'}
      ${'width'}
    `('$property', ({ property }) => {
      const fn = vi.fn()
      styleObjectForEach({ [property]: 1 }, fn)
      expect(fn).toBeCalledWith(
        property.replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`),
        '1px'
      )
    })
  })

  describe('Should skip values containing ";" to prevent CSS injection', () => {
    it('skips a value with ";"', () => {
      const fn = vi.fn()
      styleObjectForEach({ color: 'red;background:blue' }, fn)
      expect(fn).not.toBeCalled()
    })

    it('keeps safe siblings while skipping unsafe ones', () => {
      const fn = vi.fn()
      styleObjectForEach({ color: 'red;background:blue', backgroundColor: 'white' }, fn)
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith('background-color', 'white')
    })

    it('does not throw for unsafe values', () => {
      expect(() => styleObjectForEach({ color: 'a;b' }, () => {})).not.toThrow()
    })

    it('keeps semicolons inside quoted strings', () => {
      const fn = vi.fn()
      styleObjectForEach({ fontFamily: '"a;b", sans-serif' }, fn)
      expect(fn).toBeCalledWith('font-family', '"a;b", sans-serif')
    })

    test.each([
      ['LF', '\n'],
      ['CR', '\r'],
      ['FF', '\f'],
    ])('skips quoted strings that contain %s before a declaration separator', (_, newline) => {
      const fn = vi.fn()
      styleObjectForEach(
        { fontFamily: `"${newline};background:url(https://example.com/a.png)` },
        fn
      )
      expect(fn).not.toBeCalled()
    })

    it('keeps semicolons inside CSS functions', () => {
      const fn = vi.fn()
      styleObjectForEach({ backgroundImage: 'url("data:image/svg+xml;utf8,<svg></svg>")' }, fn)
      expect(fn).toBeCalledWith('background-image', 'url("data:image/svg+xml;utf8,<svg></svg>")')
    })

    test.each([['square brackets', 'red[;background:blue]']])(
      'keeps semicolons inside CSS simple blocks with %s',
      (_, value) => {
        const fn = vi.fn()
        styleObjectForEach({ color: value }, fn)
        expect(fn).toBeCalledWith('color', value)
      }
    )

    test.each([
      ['opening curly block', 'red{;background:blue}'],
      ['closing curly block', 'red};background:blue'],
    ])('skips CSS values containing %s', (_, value) => {
      const fn = vi.fn()
      styleObjectForEach({ color: value, backgroundColor: 'white' }, fn)
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith('background-color', 'white')
    })

    test.each([
      ['square brackets', 'red[;background:blue];position:fixed'],
      ['curly braces', 'red{;background:blue};position:fixed'],
    ])('skips top-level semicolons after CSS simple blocks with %s', (_, value) => {
      const fn = vi.fn()
      styleObjectForEach({ color: value }, fn)
      expect(fn).not.toBeCalled()
    })

    it('skips top-level semicolons after CSS comments', () => {
      const fn = vi.fn()
      styleObjectForEach({ color: 'red/*(*/;background:blue;position:fixed;top:0' }, fn)
      expect(fn).not.toBeCalled()
    })

    test.each([
      ['comment', 'red/*'],
      ['double-quoted string', '"abc'],
      ['single-quoted string', "'abc"],
      ['function block', 'red('],
      ['square block', 'red['],
      ['curly block', 'red{'],
      ['unmatched function closer', 'red)'],
      ['unmatched square closer', 'red]'],
      ['unmatched curly closer', 'red}'],
      ['mismatched simple block closer', 'red[)'],
      ['escape', 'red\\'],
    ])('skips unterminated CSS %s that can swallow following declarations', (_, value) => {
      const fn = vi.fn()
      styleObjectForEach({ color: value, display: 'none' }, fn)
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith('display', 'none')
    })

    test.each([
      ['comment that closes exactly at end of value', 'red/* hi */'],
      ['CSS hex escape that decodes to a delimiter byte', 'red\\3b '],
      ['vertical tab inside a quoted string', '"\vfoo"'],
      ['trailing solidus that is not a comment start', 'a/'],
    ])('keeps CSS-safe edge case — %s', (_, value) => {
      const fn = vi.fn()
      styleObjectForEach({ color: value }, fn)
      expect(fn).toBeCalledWith('color', value)
    })

    it('skips style property names that can break declaration boundaries', () => {
      const fn = vi.fn()
      styleObjectForEach({ 'color;background-image': 'url(https://example.com/a.png)' }, fn)
      styleObjectForEach({ 'color:background': 'red' }, fn)
      expect(fn).not.toBeCalled()
    })

    it('keeps safe property names that use digits', () => {
      const fn = vi.fn()
      styleObjectForEach({ '--my-var-1': '15px', '--myVar-2': '20px' }, fn)
      expect(fn).toHaveBeenNthCalledWith(1, '--my-var-1', '15px')
      expect(fn).toHaveBeenNthCalledWith(2, '--myVar-2', '20px')
    })

    it('keeps vendor-prefixed property names', () => {
      const fn = vi.fn()
      styleObjectForEach({ WebkitLineClamp: '2' }, fn)
      expect(fn).toBeCalledWith('-webkit-line-clamp', '2')
    })

    it('keeps validating style property names after the valid style property name cache is reset', () => {
      for (let i = 0; i < 1025; i++) {
        styleObjectForEach({ [`--cache-${i}`]: '1px' }, () => {})
      }

      const fn = vi.fn()
      styleObjectForEach({ '--after-reset-1': '2px', 'color:background': 'red' }, fn)
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith('--after-reset-1', '2px')
    })

    it('skips unsupported runtime values without throwing', () => {
      const fn = vi.fn()
      expect(() => styleObjectForEach({ color: false, backgroundColor: 'white' }, fn)).not.toThrow()
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith('background-color', 'white')
    })
  })
})
