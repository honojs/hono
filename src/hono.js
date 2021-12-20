const Node = require('./node')

class Router {
  constructor() {
    this.node = new Node()
    this.tempPath = '/'
  }

  add(method, path, ...handlers) {
    this.node.insert(method, path, handlers)
    return WrappedRouter(this)
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
        if (args.length === 1) {
          return target.addRoute(prop, target.router.tempPath, ...args)
        }
        return target.addRoute(prop, ...args)
      }
    },
}

// Based on the code in the MIT licensed `koa-compose` package.
const compose = (middleware) => {
  return function (req, res, next) {
    let index = -1
    return dispatch(0)
    function dispatch(i) {
      if (i <= index)
        return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(req, res, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}

class App {
  constructor() {
    this.router = new Router()
    this.routerBefore = new Router()
    this.routerAfter = new Router()
    this.middleware = []
    this.middlewareRouter = new Router()
  }

  addRoute(method, path, ...args) {
    this.router.add(method, path, ...args)
    return WrappedRouter(this)
  }

  matchRoute(method, path) {
    return this.router.match(method, path)
  }

  route(path) {
    this.router.tempPath = path
    return WrappedRouter(this)
  }

  use(path, fn) {
    fn = [fn]
    const result = this.middlewareRouter.match('all', path)
    if (result) {
      fn.push(...result.handler)
    }
    this.middlewareRouter.add('all', path, ...fn)
  }

  async dispatch(request, response) {
    const url = new URL(request.url)
    const [method, path] = [request.method, url.pathname]

    const result = this.matchRoute(method, path)
    if (!result) return this.notFound()

    request.query = (key) => {
      return url.searchParams.get(key)
    }
    request.params = (key) => {
      return result.params[key]
    }

    const middleware = []
    const mwResult = this.middlewareRouter.match('all', path)
    if (mwResult) {
      middleware.push(...mwResult.handler)
    }

    const handlers = result.handler
    for (const handler of handlers) {
      const handleReponse = handler(request)
      if (handleReponse) {
        response = handleReponse
      }
    }

    const fn = compose(middleware)
    fn(request, response)

    return response
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

const WrappedRouter = (router = new App()) => {
  return new Proxy(router, proxyHandler)
}

module.exports = WrappedRouter
