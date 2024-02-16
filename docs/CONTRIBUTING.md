# Contribution Guide

Contributions Welcome! We will be glad for your help.
You can contribute in the following ways.

- Create an Issue - Propose a new feature. Report a bug.
- Pull Request - Fix a bug and typo. Refactor the code.
- Create third-party middleware - Instruct below.
- Share - Share your thoughts on the Blog, Twitter, and others.
- Make your application - Please try to use Hono.

Note:
This project is started by Yusuke Wada ([@yusukebe](https://github.com/yusukebe)) for the hobby proposal.
It was just for fun. For now, this stance has not been changed basically.
I want to write the code as I like.
So, if you propose great ideas, but I do not appropriate them, the idea may not be accepted.

Although, don't worry!
Hono is tested well, polished by the contributors, and used by many developers. And I'll try my best to make Hono cool, beautiful, and ultrafast.

## Installing dependencies

The `honojs/hono` project uses [Bun](https://bun.sh/) as its package manager. Developers should install Bun.

After that, please install the dependency environment.

```txt
bun install
```

If you can't do that, there is also a `yarn.lock` file, so you can do the same with the `yarn` command.

```txt
yarn install --frozen-lockfile
```

## PRs

Please ensure your PR passes tests with `bun run test` or `yarn test`. Also please ensure the Deno code is generated with `yarn denoify`.

## Third-party middleware

Third-party middleware is not in the core.
It is allowed to depend on other libraries or work only in specific environments, such as only Cloudflare Workers. For examples:

- GraphQL Server middleware
- Firebase Auth middleware
- Sentry middleware

You can make a third-party middleware by yourself.
It may be under the "honojs organization" and distributed in the `@honojs` namespace.

The monorepo "[honojs/middleware](https://github.com/honojs/middleware)" manages these middleware.
If you want to do it, create the issue about your middleware.

## Local Development

```
git clone git@github.com:honojs/hono.git && cd hono/.devcontainer && yarn install --frozen-lockfile
docker compose up -d --build
docker compose exec hono bash
```