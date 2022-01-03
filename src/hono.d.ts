type Result = {
  handler: any
  params: {}
}

declare class Node {
  method: string
  handler: any
  children: Node[]
  middlewares: any[]

  insert(method: string, path: string, handler: any): Node
  search(method: string, path: string): Result
}

declare class Context {
  req: Request
  res: Response
  newResponse(params: {}): Response
}

type Handler = (c: Context, next: () => void) => Response | void

declare class Router {
  tempPath: string
  node: Node

  add(method: string, path: string, handler: Handler): Node
  match(method: string, path: string): Node
}

export class Hono {
  router: Router
  middlewareRouters: Router[]

  use(path: string, middleware: Handler): void

  route(path: string): Hono
  fire(): void

  all(path: string, handler: Handler): Hono
  get(path: string, handler: Handler): Hono
  post(path: string, handler: Handler): Hono
  put(path: string, handler: Handler): Hono
  head(path: string, handler: Handler): Hono
  delete(path: string, handler: Handler): Hono

  notFound(): Response

  getRouter(): Router
  addRoute(method: string, args: any[]): Hono
  matchRoute(method: string, path: string): Promise<Node>
  createContext(req: Request, res: Response): Promise<Context>
  dispatch(req: Request, res: Response): Promise<Response>
  handleEvent(event: FetchEvent): Promise<Response>
}

export class Middleware {
  static defaultFilter: Handler
  // Add builtin middlewares
  static poweredBy: Handler
}

interface FetchEvent extends Event {
  request: Request
  respondWith(response: Promise<Response> | Response): Promise<Response>
}
