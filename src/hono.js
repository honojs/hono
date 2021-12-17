const Node = require('./node')

class Router {
  constructor() {
    this.node = new Node()
    this.tempPath = '/'
  }

  route(path) {
    this.tempPath = path
    return WrappedRouter(this)
  }

  addRoute(method, path, handler) {
    this.node.insert(method, path, handler)
    return WrappedRouter(this)
  }

  matchRoute(method, path) {
    method = method.toLowerCase()
    const res = this.node.search(method, path)
    return res
  }

  handle(event) {
    const result = this.dispatch(event.request)
    const response = this.filter(result)
    return event.respondWith(response)
  }

  filter(result) {
    if (result instanceof Response) {
      return result
    }
    if (typeof result === 'object') {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
    if (typeof result === 'string') {
      return new Response(result, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      })
    }
    return this.notFound()
  }

  dispatch(request) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method
    const res = this.matchRoute(method, path)

    if (!res) {
      return this.notFound()
    }

    const handler = res.handler
    return handler(request)
  }

  notFound() {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain',
      },
    })
  }

  fire() {
    addEventListener('fetch', (event) => {
      this.handle(event)
    })
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
          return target.addRoute(prop, target.tempPath, ...args)
        }
        return target.addRoute(prop, ...args)
      }
    },
}

const WrappedRouter = (router = new Router()) => {
  return new Proxy(router, proxyHandler)
}

module.exports = WrappedRouter
