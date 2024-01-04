import { describe, it, expect } from 'vitest';
import { toSsg }  from './index'; 
import { Hono } from '../../hono';

describe('toSsg function', () => {
  it('Should correctly generate static HTML files for Hono routes', async () => {
    const app = new Hono();
    app.get('/', (c) => c.text('Hello, World!'));
    app.get('/about', (c) => c.text('About Page'));
    app.get('/about/some', (c) => c.text('About Page 2tier'));
    app.post('/about/some/thing', (c) => c.text('About Page 3tier'));
    app.get('/bravo', (c) => c.html('Bravo Page'));
    app.get('/Charlie',)


    // ファイルシステムのモック
    const fsMock = {
      writeFile: vitest.fn((path, data) => Promise.resolve()),
    };

    // toSsg関数の実行
    await toSsg(app, fsMock);

    // 期待されるファイルの生成を確認
    expect(fsMock.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Hello, World!'));
    expect(fsMock.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('About Page'));
  });
});
