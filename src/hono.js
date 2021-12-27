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

const proxyHandler = {
  get:
    (target, prop) =>
    (...args) => {
      if (prop === 'handleEvent') {
        return target.handleEvent(...args)
      }
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

  getRouter() {
    return this.router
  }

  addRoute(method, path, ...args) {
    method = method.toUpperCase()
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
    const router = new Router()
    router.add('all', path, middleware)
    this.middlewareRouters.push(router)
  }

  /*
  use(path, middleware) {
    middleware = [middleware]
    const result = this.middlewareRouter.match('all', path)
    if (result) {
      middleware.push(...result.handler)
    }
    this.middlewareRouter.add('all', path, ...middleware)
  }
  */

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
    return new Response('Hello')
    return this.dispatch(event.request, {}) // XXX
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
