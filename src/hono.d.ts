declare class FetchEvent {}
declare class Request {}
declare class Response {}
declare class Context {}

declare class Node {}

declare class Router {
  tempPath: string
  node: Node

  add(method: string, path: string, handlers: any[]): Node
  match(method: string, path: string): Node
}

export class Hono {
  router: Router
  middlewareRouters: Router[]

  getRouter(): Router
  addRoute(method: string, args: any[]): Hono
  matchRoute(method: string, path: string): Node
  createContext(req: Request, res: Response): Context
  dispatch(req: Request, res: Response): Response
  handleEvent(event: FetchEvent): Response
  fire(): void

  notFound(): Response

  route(path: string): Hono

  use(path: string, middleware: any): void

  all(path: string, handler: any): Hono
  get(path: string, handler: any): Hono
  post(path: string, handler: any): Hono
  put(path: string, handler: any): Hono
  head(path: string, handler: any): Hono
  delete(path: string, handler: any): Hono
}

export class Middleware {}
