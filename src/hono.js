'use strict'

const Node = require('./node')
const compose = require('./compose')
const defaultFilter = require('./middleware/filter')

class Router {
  constructor() {
    this.node = new Node()
    this.tempPath = '/'
  }

  add(method, path, ...handlers) {
    this.node.insert(method, path, handlers)
  }

  match(method, path) {
    return this.node.search(method, path)
  }
}

const getPathFromURL = (url) => {
  url = new URL(url)
  return url.pathname
}

class App {
  constructor() {
    this.router = new Router()
    this.middlewareRouter = new Router()
    this.middlewareRouters = []
  }

  get(...args) {
    return this.addRoute('GET', ...args)
  }
  post(...args) {
    return this.addRoute('POST', ...args)
  }
  put(...args) {
    return this.addRoute('PUT', ...args)
  }
  delete(...args) {
    return this.addRoute('DELETE', ...args)
  }
  patch(...args) {
    return this.addRoute('PATCH', ...args)
  }

  addRoute(method, ...args) {
    method = method.toUpperCase()
    if (args.length === 1) {
      this.router.add(method, this.router.tempPath, ...args)
    } else {
      this.router.add(method, ...args)
    }
    return this
  }

  getRouter() {
    return this.router
  }

  matchRoute(method, path) {
    const res = this.router.match(method, path)
    return res
  }

  route(path) {
    this.router.tempPath = path
    return this
  }

  use(path, middleware) {
    const router = new Router()
    router.add('all', path, middleware)
    this.middlewareRouters.push(router)
  }

  // XXX
  createContext(req, res) {
    return { req: req, res: res }
  }

  async dispatch(request, response) {
    const [method, path] = [request.method, getPathFromURL(request.url)]

    const result = this.matchRoute(method, path)
    if (!result) return this.notFound()

    request.params = (key) => result.params[key]

    let handler = result.handler[0] // XXX

    const middleware = [defaultFilter]

    for (const mr of this.middlewareRouters) {
      const mwResult = mr.match('all', path)
      if (mwResult) {
        middleware.push(...mwResult.handler)
      }
    }

    let wrappedHandler = (context, next) => {
      context.res = handler(context)
      next()
    }

    middleware.push(wrappedHandler)
    const composed = compose(middleware)
    const c = this.createContext(request, response)

    composed(c)

    return c.res
  }

  async handleEvent(event) {
    await this.dispatch(event.request, {}) // XXX
  }

  fire() {
    addEventListener('fetch', (event) => {
      event.respondWith(this.handleEvent(event))
    })
  }

  notFound() {
    return new Response('Not Found', { status: 404 })
  }
}

const CreateApp = () => {
  return new App()
}

module.exports = CreateApp
