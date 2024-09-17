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

    expect(getFilePath({ filename: 'filename.suffix_index' })).toBe('filename.suffix_index')
    expect(getFilePath({ filename: 'filename.suffix-index' })).toBe('filename.suffix-index')
  })

  it('Should return file path correctly with allowAbsoluteRoot', async () => {
    const allowAbsoluteRoot = true
    expect(getFilePath({ filename: 'foo.txt', allowAbsoluteRoot })).toBe('/foo.txt')
    expect(getFilePath({ filename: 'foo.txt', root: '/p', allowAbsoluteRoot })).toBe('/p/foo.txt')
    expect(getFilePath({ filename: 'foo', root: '/p', allowAbsoluteRoot })).toBe(
      '/p/foo/index.html'
    )
    expect(getFilePath({ filename: 'foo.txt', root: '/p/../p2', allowAbsoluteRoot })).toBe(
      '/p2/foo.txt'
    )
    expect(getFilePath({ filename: 'foo', root: '/p/bar', allowAbsoluteRoot })).toBe(
      '/p/bar/foo/index.html'
    )

    expect(
      getFilePath({ filename: 'foo.txt', root: slashToBackslash('/p'), allowAbsoluteRoot })
    ).toBe('/p/foo.txt')

    expect(
      getFilePath({ filename: 'foo.txt', root: slashToBackslash('/p/../p2'), allowAbsoluteRoot })
    ).toBe('/p2/foo.txt')
  })
})

function slashToBackslash(filename: string) {
  return filename.split('/').join('\\')
}
