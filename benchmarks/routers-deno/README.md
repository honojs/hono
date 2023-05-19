# Router benchmarks

Benchmark of the most commonly used HTTP routers.

Tested routes:

- [find-my-way](https://github.com/delvedor/find-my-way)
- [koa-router](https://github.com/alexmingoia/koa-router)
- [koa-tree-router](https://github.com/steambap/koa-tree-router)
- [trek-router](https://www.npmjs.com/package/trek-router)
- [@medley/router](https://www.npmjs.com/package/@medley/router)
- [Hono RegExpRouter](https://github.com/honojs/hono)
- [Hono TrieRouter](https://github.com/honojs/hono)

For Deno:

```
deno run --allow-read --allow-run src/bench.mts
```

This project is heavily impaired by [delvedor/router-benchmark](https://github.com/delvedor/router-benchmark)

## License

MIT
