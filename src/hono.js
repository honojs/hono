const Node = require('./node')
const filter = require('./middleware/request')

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
    this.middlewareRouter = new Router()
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
      handler = resultHandler
    }

    /*
    middleware.push((req, res, next) => {
      handler(req, res)
      next()
    })
    */

    const composed = compose(middleware)
    composed(request, response)
    response = await handler(request, response)
    composed(request, response)

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

const WrappedApp = (router = new App()) => {
  return new Proxy(router, proxyHandler)
}

module.exports = WrappedApp
