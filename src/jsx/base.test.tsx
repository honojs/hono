/** @jsxImportSource ./ */

import type { HtmlEscapedString } from '../utils/html'
import type { Child, JSXNode } from './base'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cloneElement, jsx, Fragment } from './base'

describe('cloneElement', () => {
  it('should clone an element with new props', () => {
    const element = <div className='original'>Hello</div>
    const clonedElement = cloneElement(element, { className: 'cloned' })
    expect((clonedElement as unknown as JSXNode).props.className).toBe('cloned')
    expect((clonedElement as unknown as JSXNode).props.children).toBe('Hello')
  })

  it('should clone a children element', () => {
    const fnElement = ({ message }: { message: string }) => <div>{message}</div>
    const element = fnElement({ message: 'Hello' })
    const clonedElement = cloneElement(element, {})
    expect(element.toString()).toBe('<div>Hello</div>')
    expect(clonedElement.toString()).toBe('<div>Hello</div>')
  })

  it('should clone an element with new children', () => {
    const fnElement = ({ message }: { message: string }) => <div>{message}</div>
    const element = fnElement({ message: 'Hello' })
    const clonedElement = cloneElement(element, {}, 'World')
    expect(element.toString()).toBe('<div>Hello</div>')
    expect(clonedElement.toString()).toBe('<div>World</div>')
  })

  it('should self-close a wrapped empty tag', () => {
    const Hr = ({ ...props }) => <hr {...props} />
    const element = <Hr />
    expect(element.toString()).toBe('<hr/>')
  })
})

describe('createElement', () => {
  it('should accept a component that returns a JSXNode', () => {
    const Partial = ({ name }: { name: string }) => jsx('div', { 'x-partial': name }, name)

    expect((<Partial name='foo' />).toString()).toBe('<div x-partial="foo">foo</div>')
  })

  it('should preserve the SVG element shape', () => {
    const ref = { current: null }
    const element = jsx('svg', { ref }) as unknown as JSXNode
    expect(element.tag).toBe('svg')
    expect(element.type).toBe('svg')
    expect(element.ref).toBe(ref)
  })

  it('should accept a Child-typed value as a child', () => {
    const child: Child = <span>inner</span>
    const element = jsx('div', null, child) as unknown as JSXNode
    expect(element.toString()).toBe('<div><span>inner</span></div>')
  })

  it('should escape a string returned by an asynchronous component', async () => {
    const Async = async () => '<img src=x onerror=alert(1)>' as unknown as HtmlEscapedString

    expect(
      String(
        await (
          <div>
            <Async />
          </div>
        ).toString()
      )
    ).toBe('<div>&lt;img src=x onerror=alert(1)&gt;</div>')
  })

  it('should omit an unsupported object child', () => {
    const object = { toString: () => 'plain-text' }

    expect((<div>{object as never}</div>).toString()).toBe('<div></div>')
  })
})

describe('attribute value escaping', () => {
  it('should escape a JSX node used as an attribute value', () => {
    const element = <div title={(<img src='y' onerror='alert(1)' />) as never}>x</div>
    expect(element.toString()).toBe(
      '<div title="&lt;img src=&quot;y&quot; onerror=&quot;alert(1)&quot;/&gt;">x</div>'
    )
  })

  it('should escape a JSX node resolved from a promise attribute', async () => {
    const element = (
      <div title={Promise.resolve(<img src='y' onerror='alert(1)' />) as never}>x</div>
    )
    expect(String(await element.toString())).toBe(
      '<div title="&lt;img src=&quot;y&quot; onerror=&quot;alert(1)&quot;/&gt;">x</div>'
    )
  })

  it('should escape an async component node used as an attribute value', async () => {
    const Async = async () => <img src='y' onerror='alert(1)' />
    const element = <div title={(<Async />) as never}>x</div>
    expect(String(await element.toString())).toBe(
      '<div title="&lt;img src=&quot;y&quot; onerror=&quot;alert(1)&quot;/&gt;">x</div>'
    )
  })

  it('should escape an async render result used as an attribute value', async () => {
    const Async = async () => <img src='y' onerror='alert(1)' />
    const rendered = await (<Async />).toString()
    expect((<div title={rendered}>x</div>).toString()).toBe(
      '<div title="&lt;img src=&quot;y&quot; onerror=&quot;alert(1)&quot;/&gt;">x</div>'
    )
    expect((<div>{rendered}</div>).toString()).toBe('<div><img src="y" onerror="alert(1)"/></div>')
  })

  it('should escape a plain object resolved from a promise attribute', async () => {
    const element = <div title={Promise.resolve({ toString: () => '<b>x</b>' }) as never}>x</div>
    expect(String(await element.toString())).toBe('<div title="&lt;b&gt;x&lt;/b&gt;">x</div>')
  })
})

describe('declarative Shadow DOM boolean attributes', () => {
  it.each(['shadowrootclonable', 'shadowrootdelegatesfocus', 'shadowrootserializable'])(
    'should render %s only when true',
    (key) => {
      expect((<template {...{ [key]: true }} />).toString()).toBe(`<template ${key}=""></template>`)
      expect((<template {...{ [key]: false }} />).toString()).toBe('<template></template>')
    }
  )
})

describe('style attributes', () => {
  it.each([null, undefined])('should omit a %s style attribute', (style) => {
    expect((<div style={style as never} />).toString()).toBe('<div></div>')
  })
})
