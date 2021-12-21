'use strict'

const Node = require('./node')
const compose = require('./compose')
const filter = require('./middleware/filter')

class Router {
  constructor() {
    this.node = new Node()
    this.tempPath = '/'
  }

  add(method, path, ...handlers) {
    this.node.insert(method, path, handlers)
  }

  match(method, path) {
    method = method.toLowerCase()
    return this.node.search(method, path)
  }
}

const proxyHandler = {
  get:
    (target, prop) =>
    (...args) => {
      if (target.constructor.prototype.hasOwnProperty(prop)) {
        return target[prop](...args)
      } else {
        if (args.length == 1) {
          return target.addRoute(prop, target.router.tempPath, ...args)
        }
        return target.addRoute(prop, ...args)
      }
    },
}

class App {
  constructor() {
    this.router = new Router()
    this.middlewareRouter = new Router()
    this.middleware = []
  }

  addRoute(method, path, ...args) {
    this.router.add(method, path, ...args)
    return WrappedApp(this)
  }

  matchRoute(method, path) {
    return this.router.match(method, path)
  }

  route(path) {
    this.router.tempPath = path
    return WrappedApp(this)
  }

  use(path, middleware) {
    middleware = [middleware]
    const result = this.middlewareRouter.match('all', path)
    if (result) {
      middleware.push(...result.handler)
    }
    this.middlewareRouter.add('all', path, ...middleware)
  }

  // XXX
  createContext(req, res) {
    return { req: req, res: res }
  }

  async dispatch(request, response) {
    const url = new URL(request.url)
    const [method, path] = [request.method, url.pathname]

    const result = this.matchRoute(method, path)
    if (!result) return this.notFound()

    request.params = (key) => result.params[key]

    const middleware = [filter]
    const mwResult = this.middlewareRouter.match('all', path)
    if (mwResult) {
      middleware.push(...mwResult.handler)
    }

    let handler
    for (const resultHandler of result.handler) {
      if (resultHandler) {
        handler = resultHandler
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
    return await this.dispatch(event.request, new Response())
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

const WrappedApp = (router = new App()) => {
  return new Proxy(router, proxyHandler)
}

module.exports = WrappedApp
