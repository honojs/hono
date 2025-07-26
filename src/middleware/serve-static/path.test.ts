import { defaultJoin } from './path'

describe('defaultJoin', () => {
  it('should behave like Node.js path.join for Unix paths', () => {
    expect(defaultJoin('./public', 'static/main.html')).toBe('public/static/main.html')
    expect(defaultJoin('/home/yusuke/work/app/public', 'static/main.html')).toBe(
      '/home/yusuke/work/app/public/static/main.html'
    )
    expect(defaultJoin('./public', '/absolute/path.html')).toBe('public/absolute/path.html')
    expect(defaultJoin('./public', '../parent/file.html')).toBe('parent/file.html')
    expect(defaultJoin('public', './file.html')).toBe('public/file.html')
    expect(defaultJoin('public/', 'file.html')).toBe('public/file.html')
    expect(defaultJoin('public', 'sub/', 'file.html')).toBe('public/sub/file.html')
    expect(defaultJoin('', 'file.html')).toBe('file.html')
    expect(defaultJoin('public', '')).toBe('public')
  })

  it('should behave like Node.js path.win32.join for Windows paths', () => {
    expect(defaultJoin('C:\\Users\\user', 'Documents\\file.txt')).toBe(
      'C:\\Users\\user\\Documents\\file.txt'
    )
    expect(defaultJoin('public', 'static\\main.html')).toBe('public\\static\\main.html')
    expect(defaultJoin('.\\public', 'static/main.html')).toBe('public\\static\\main.html')
    expect(defaultJoin('C:\\Program Files\\App', 'static\\file.txt')).toBe(
      'C:\\Program Files\\App\\static\\file.txt'
    )
    expect(defaultJoin('public\\', 'file.html')).toBe('public\\file.html')
    expect(defaultJoin('public', 'sub\\', 'file.html')).toBe('public\\sub\\file.html')
    expect(defaultJoin('', 'file.html')).toBe('file.html')
    expect(defaultJoin('public', '')).toBe('public')
  })

  it('should handle mixed path separators', () => {
    expect(defaultJoin('C:\\Users', 'Documents/file.txt')).toBe('C:\\Users\\Documents\\file.txt')
    expect(defaultJoin('public\\', 'static/main.html')).toBe('public\\static\\main.html')
    expect(defaultJoin('./public', 'static\\main.html')).toBe('public\\static\\main.html')
  })

  it('should handle Windows relative paths with ..', () => {
    expect(defaultJoin('.\\public', '..\\parent\\file.html')).toBe('parent\\file.html')
    expect(defaultJoin('C:\\Users\\user', '..\\other\\file.txt')).toBe('C:\\Users\\other\\file.txt')
  })
})
