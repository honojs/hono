import { Children } from './children'
import { createElement } from '.'

describe('map', () => {
  it('should map children', () => {
    const element = createElement('div', null, 1, 2, 3)
    const result = Children.map(element.children, (child) => (child as number) * 2)
    expect(result).toEqual([2, 4, 6])
  })
})

describe('forEach', () => {
  it('should iterate children', () => {
    const element = createElement('div', null, 1, 2, 3)
    const result: number[] = []
    Children.forEach(element.children, (child) => {
      result.push(child as number)
    })
    expect(result).toEqual([1, 2, 3])
  })
})

describe('count', () => {
  it('should count children', () => {
    const element = createElement('div', null, 1, 2, 3)
    const result = Children.count(element.children)
    expect(result).toBe(3)
  })
})

describe('only', () => {
  it('should return the only child', () => {
    const element = createElement('div', null, 1)
    const result = Children.only(element.children)
    expect(result).toBe(1)
  })

  it('should throw an error if there are multiple children', () => {
    const element = createElement('div', null, 1, 2)
    expect(() => Children.only(element.children)).toThrowError(
      'Children.only() expects only one child'
    )
  })
})

describe('toArray', () => {
  it('should convert children to an array', () => {
    const element = createElement('div', null, 1, 2, 3)
    const result = Children.toArray(element.children)
    expect(result).toEqual([1, 2, 3])
  })
})
