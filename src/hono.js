'use strict'

const Node = require('./node')
const Middleware = require('./middleware')
const compose = require('./compose')
const methods = require('./methods')
const { getPathFromURL } = require('./util')

const METHOD_NAME_OF_ALL = 'ALL'

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

class Hono {
  constructor() {
    this.router = new Router()
    this.middlewareRouters = []

    for (const method of methods) {
      this[method] = (...args) => {
        return this.addRoute(method, ...args)
      }
    }
  }

  all(...args) {
    this.addRoute('ALL', ...args)
  }

  getRouter() {
    return this.router
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

  route(path) {
    this.router.tempPath = path
    return this
  }

  use(path, middleware) {
    if (middleware.constructor.name !== 'AsyncFunction') {
      throw new TypeError('middleware must be a async function!')
    }

    const router = new Router()
    router.add(METHOD_NAME_OF_ALL, path, middleware)
    this.middlewareRouters.push(router)
  }

  async matchRoute(method, path) {
    return this.router.match(method, path)
  }

  // XXX
  async createContext(req, res) {
    return {
      req: req,
      res: res,
      newResponse: (params) => {
        return new Response(params)
      },
    }
  }

  async dispatch(request, response) {
    const [method, path] = [request.method, getPathFromURL(request.url)]

    const result = await this.matchRoute(method, path)

    request.params = (key) => result.params[key]

    let handler = result ? result.handler[0] : this.notFound // XXX

    const middleware = [Middleware.defaultFilter] // add defaultFilter later

    for (const mr of this.middlewareRouters) {
      const mwResult = mr.match(METHOD_NAME_OF_ALL, path)
      if (mwResult) {
        middleware.push(...mwResult.handler)
      }
    }

    let wrappedHandler = async (context, next) => {
      context.res = handler(context)
      next()
    }

    middleware.push(wrappedHandler)
    const composed = compose(middleware)
    const c = await this.createContext(request, response)

    composed(c)

    return c.res
  }

  async handleEvent(event) {
    return this.dispatch(event.request, {}) // XXX
  }

  fire() {
    addEventListener('fetch', (event) => {
      event.respondWith(this.handleEvent(event))
    })
  }

  async notFound() {
    return new Response('Not Found', { status: 404 })
  }
}

// Default Export
module.exports = Hono
exports = module.exports

// Named Export
exports.Hono = Hono
exports.Middleware = Middleware
