<div align="center">
  <a href="https://hono.dev">
    <img src="https://raw.githubusercontent.com/honojs/hono/main/docs/images/hono-title.png" width="500" height="auto" alt="Hono"/>
  </a>
</div>

<hr />

<p align="center">
<a href="https://hono.dev"><b>Documentation :point_right: hono.dev</b></a><br />
<i>v4 has been released!</i> <a href="docs/MIGRATION.md">Migration guide</b>
</p>

<hr />

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/honojs/hono/ci.yml?branch=main)](https://github.com/honojs/hono/actions)
[![GitHub](https://img.shields.io/github/license/honojs/hono)](https://github.com/honojs/hono/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/hono)](https://www.npmjs.com/package/hono)
[![npm](https://img.shields.io/npm/dm/hono)](https://www.npmjs.com/package/hono)
[![Bundle Size](https://img.shields.io/bundlephobia/min/hono)](https://bundlephobia.com/result?p=hono)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/hono)](https://bundlephobia.com/result?p=hono)
[![npm type definitions](https://img.shields.io/npm/types/hono)](https://www.npmjs.com/package/hono)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/honojs/hono)](https://github.com/honojs/hono/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/honojs/hono)](https://github.com/honojs/hono/commits/main)
[![Deno badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Flatest-version%2Fx%2Fhono%2Fmod.ts)](https://doc.deno.land/https/deno.land/x/hono/mod.ts)
[![Discord badge](https://img.shields.io/discord/1011308539819597844?label=Discord&logo=Discord)](https://discord.gg/KMh2eNSdxV)

Hono - _**\[炎\] means flame🔥 in Japanese**_ - is a small, simple, and ultrafast web framework for the Edges.
It works on any JavaScript runtime: Cloudflare Workers, Fastly Compute, Deno, Bun, Vercel, AWS Lambda, Lambda@Edge, and Node.js.

Fast, but not only fast.

```ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

export default app
```

## Quick Start

```
npm create hono@latest
```

## Features

- **Ultrafast** 🚀 - The router `RegExpRouter` is really fast. Not using linear loops. Fast.
- **Lightweight** 🪶 - The `hono/tiny` preset is under 13kB. Hono has zero dependencies and uses only the Web Standard API.
- **Multi-runtime** 🌍 - Works on Cloudflare Workers, Fastly Compute, Deno, Bun, AWS Lambda, Lambda@Edge, or Node.js. The same code runs on all platforms.
- **Batteries Included** 🔋 - Hono has built-in middleware, custom middleware, and third-party middleware. Batteries included.
- **Delightful DX** 😃 - Super clean APIs. First-class TypeScript support. Now, we've got "Types".

## Benchmarks

**Hono is the fastest**, compared to other routers for Cloudflare Workers.

```
Hono x 510,171 ops/sec ±4.61% (82 runs sampled)
itty-router x 285,810 ops/sec ±4.13% (85 runs sampled)
sunder x 345,272 ops/sec ±4.46% (87 runs sampled)
worktop x 203,468 ops/sec ±3.03% (91 runs sampled)
Fastest is Hono
✨  Done in 28.68s.
```

## Documentation

The documentation is available on [hono.dev](https://hono.dev).

## Migration

The migration guide is available on [docs/MIGRATION.md](docs/MIGRATION.md).

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

Thanks to [all contributors](https://github.com/honojs/hono/graphs/contributors)!

## Authors

Yusuke Wada <https://github.com/yusukebe>

_RegExpRouter_, _SmartRouter_, _LinearRouter_, and _PatternRouter_ are created by Taku Amano <https://github.com/usualoma>

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
