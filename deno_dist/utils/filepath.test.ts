import { getFilePath } from './filepath.ts'

describe('getFilePath', () => {
  it('Should return file path correctly', async () => {
    expect(getFilePath({ filename: 'foo' })).toBe('foo/index.html')
    expect(getFilePath({ filename: 'foo.txt' })).toBe('foo.txt')

    expect(getFilePath({ filename: 'foo', root: 'bar' })).toBe('bar/foo/index.html')
    expect(getFilePath({ filename: 'foo.txt', root: 'bar' })).toBe('bar/foo.txt')

    expect(getFilePath({ filename: 'foo', defaultDocument: 'index.txt' })).toBe('foo/index.txt')
    expect(getFilePath({ filename: 'foo', root: 'bar', defaultDocument: 'index.txt' })).toBe(
      'bar/foo/index.txt'
    )

    expect(getFilePath({ filename: './foo' })).toBe('foo/index.html')
    expect(getFilePath({ filename: 'foo', root: './bar' })).toBe('bar/foo/index.html')

    expect(getFilePath({ filename: '../foo' })).toBeUndefined()
    expect(getFilePath({ filename: '/../foo' })).toBeUndefined()
    expect(getFilePath({ filename: './../foo' })).toBeUndefined()
    expect(getFilePath({ filename: 'foo..bar.txt' })).toBe('foo..bar.txt')
    expect(getFilePath({ filename: '/foo..bar.txt' })).toBe('foo..bar.txt')
    expect(getFilePath({ filename: './foo..bar.txt' })).toBe('foo..bar.txt')
    expect(getFilePath({ filename: './..foo/bar.txt' })).toBe('..foo/bar.txt')
    expect(getFilePath({ filename: './foo../bar.txt' })).toBe('foo../bar.txt')
    expect(getFilePath({ filename: './..foo../bar.txt' })).toBe('..foo../bar.txt')
  })
})
