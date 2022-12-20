<div align="center">
  <a href="https://honojs.dev">
    <img src="https://raw.githubusercontent.com/honojs/hono/main/docs/images/hono-title.png" width="500" height="auto" alt="Hono"/>
  </a>
</div>

<hr />

<p align="center">
<a href="https://honojs.dev"><b>Documentation :point_right: honojs.dev</b></a><br />
<i>v2.x has been released!</i> <a href="docs/MIGRATION.md">Migration guide</b>
</p>

<hr />

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/honojs/hono/ci.yml?branch=main)](https://github.com/honojs/hono/actions)
[![GitHub](https://img.shields.io/github/license/honojs/hono)](https://github.com/honojs/hono/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/hono)](https://www.npmjs.com/package/hono)
[![npm](https://img.shields.io/npm/dm/hono)](https://www.npmjs.com/package/hono)
[![npm type definitions](https://img.shields.io/npm/types/hono)](https://www.npmjs.com/package/hono)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/honojs/hono)](https://github.com/honojs/hono/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/honojs/hono)](https://github.com/honojs/hono/commits/main)
[![Deno badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Flatest-version%2Fx%2Fhono%2Fmod.ts)](https://doc.deno.land/https/deno.land/x/hono/mod.ts)
[![Discord badge](https://img.shields.io/discord/1011308539819597844?label=Discord&logo=Discord)](https://discord.gg/KMh2eNSdxV)

Hono - _**[炎] means flame🔥 in Japanese**_ - is a small, simple, and ultrafast web framework for Cloudflare Workers, Deno, Bun, and others.

```ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!!'))

export default app
```

## Features

- **Ultrafast** - The routers are really smart. Not using linear loops. The fastest one will be selected from three routers.
- **Zero-dependencies** - Using only Web Standard API. Does not depend on other npm or Deno libraries.
- **Middleware** - Hono has built-in middleware, custom middleware, and third-party middleware. Batteries included.
- **TypeScript** - First-class TypeScript support. Now, we've got "Types".
- **Multi-runtime** - Works on Cloudflare Workers, Fastly Compute@Edge, Deno, Bun, or Node.js. The same code runs on all platforms.

## Benchmarks

**Hono is fastest**, compared to other routers for Cloudflare Workers.

```plain
Hono x 616,464 ops/sec ±4.76% (83 runs sampled)
itty-router x 203,074 ops/sec ±3.66% (88 runs sampled)
sunder x 314,306 ops/sec ±2.28% (87 runs sampled)
worktop x 194,111 ops/sec ±2.78% (81 runs sampled)
Fastest is Hono
✨  Done in 30.77s.
```

## Documentation

The documentation is available on [honojs.dev](https://honojs.dev).

## Migration

Migration guide is available on [docs/MIGRATION.md](docs/MIGRATION.md).

## Communication

[Twitter](https://twitter.com/honojs) and [Discord channel](https://discord.gg/KMh2eNSdxV) are available.

## Contributing

Contributions Welcome! You can contribute in the following ways.

- Create an Issue - Propose a new feature. Report a bug.
- Pull Request - Fix a bug and typo. Refactor the code.
- Create third-party middleware - Instruct below.
- Share - Share your thoughts on the Blog, Twitter, and others.
- Make your application - Please try to use Hono.

For more details, see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Contributors

Thanks to [all contributors](https://github.com/honojs/hono/graphs/contributors)! Especially, [@metrue](https://github.com/metrue) and [@usualoma](https://github.com/usualoma)!

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
