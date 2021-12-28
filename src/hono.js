'use strict'

const Node = require('./node')
const compose = require('./compose')
const defaultFilter = require('./middleware/defaultFilter')

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
  // XXX
  const match = url.match(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/)
  return match[5]
}

const proxyHandler = {
  get:
    (target, prop) =>
    (...args) => {
      if (target.constructor.prototype.hasOwnProperty(prop)) {
        return target[prop](...args)
      } else {
        return target.addRoute(prop, ...args)
      }
    },
}

class Hono {
  constructor() {
    this.router = new Router()
    this.middlewareRouter = new Router()
    this.middlewareRouters = []
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
    return WrappedApp(this)
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
    if (!result) return this.notFound()

    request.params = (key) => result.params[key]

    let handler = result.handler[0] // XXX

    const middleware = [defaultFilter] // add defaultFilter later

    for (const mr of this.middlewareRouters) {
      const mwResult = mr.match('all', path)
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

  notFound() {
    return new Response('Not Found', { status: 404 })
  }
}

const WrappedApp = (hono = new Hono()) => {
  return new Proxy(hono, proxyHandler)
}

module.exports = WrappedApp
