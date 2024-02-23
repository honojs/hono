import { getFilePath, getFilePathWithoutDefaultDocument } from './filepath'

describe('getFilePathWithoutDefaultDocument', () => {
  it('Should return file path correctly', async () => {
    expect(getFilePathWithoutDefaultDocument({ filename: 'foo.txt' })).toBe('foo.txt')
    expect(getFilePathWithoutDefaultDocument({ filename: 'foo.txt', root: 'bar' })).toBe(
      'bar/foo.txt'
    )

    expect(getFilePathWithoutDefaultDocument({ filename: '../foo' })).toBeUndefined()
    expect(getFilePathWithoutDefaultDocument({ filename: '/../foo' })).toBeUndefined()
    expect(getFilePathWithoutDefaultDocument({ filename: './../foo' })).toBeUndefined()
    expect(getFilePathWithoutDefaultDocument({ filename: 'foo..bar.txt' })).toBe('foo..bar.txt')
    expect(getFilePathWithoutDefaultDocument({ filename: '/foo..bar.txt' })).toBe('foo..bar.txt')
    expect(getFilePathWithoutDefaultDocument({ filename: './foo..bar.txt' })).toBe('foo..bar.txt')
    expect(getFilePathWithoutDefaultDocument({ filename: './..foo/bar.txt' })).toBe('..foo/bar.txt')
    expect(getFilePathWithoutDefaultDocument({ filename: './foo../bar.txt' })).toBe('foo../bar.txt')
    expect(getFilePathWithoutDefaultDocument({ filename: './..foo../bar.txt' })).toBe(
      '..foo../bar.txt'
    )

    expect(
      getFilePathWithoutDefaultDocument({ filename: slashToBackslash('/../foo') })
    ).toBeUndefined()
    expect(
      getFilePathWithoutDefaultDocument({ filename: slashToBackslash('./../foo') })
    ).toBeUndefined()
    expect(getFilePathWithoutDefaultDocument({ filename: slashToBackslash('foo..bar.txt') })).toBe(
      'foo..bar.txt'
    )
    expect(getFilePathWithoutDefaultDocument({ filename: slashToBackslash('/foo..bar.txt') })).toBe(
      'foo..bar.txt'
    )
    expect(
      getFilePathWithoutDefaultDocument({ filename: slashToBackslash('./foo..bar.txt') })
    ).toBe('foo..bar.txt')
    expect(
      getFilePathWithoutDefaultDocument({ filename: slashToBackslash('./..foo/bar.txt') })
    ).toBe('..foo/bar.txt')
    expect(
      getFilePathWithoutDefaultDocument({ filename: slashToBackslash('./foo../bar.txt') })
    ).toBe('foo../bar.txt')
    expect(
      getFilePathWithoutDefaultDocument({ filename: slashToBackslash('./..foo../bar.txt') })
    ).toBe('..foo../bar.txt')
  })
})

describe('getFilePath', () => {
  it('Should return file path correctly', async () => {
    expect(getFilePath({ filename: 'foo' })).toBe('foo/index.html')

    expect(getFilePath({ filename: 'foo', root: 'bar' })).toBe('bar/foo/index.html')

    expect(getFilePath({ filename: 'foo', defaultDocument: 'index.txt' })).toBe('foo/index.txt')
    expect(getFilePath({ filename: 'foo', root: 'bar', defaultDocument: 'index.txt' })).toBe(
      'bar/foo/index.txt'
    )
  })
})

function slashToBackslash(filename: string) {
  return filename.split('/').join('\\')
}
