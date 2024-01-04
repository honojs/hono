import type { Hono } from '../../hono'
import { inspectRoutes } from '../../helper/dev';

export const toSsg = async (app: Hono, fsModule: { writeFile: Function }) => {
  const routes = inspectRoutes(app).map((route: { path: any; }) => route.path);
  const baseURL = 'http://localhost';

  for (const route of routes) {
    const url = new URL(route, baseURL).toString();
    const response = await app.fetch(new Request(url));
    const html = await response.text();
    await fsModule.writeFile(`./static${route === '/' ? '/index' : route}.html`, html);
  }
};