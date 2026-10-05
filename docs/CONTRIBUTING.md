# Contribution Guide

Contributions Welcome! We will be glad for your help.
You can contribute in the following ways.

- Create an Issue - Propose a new feature. Report a bug. Point out a typo.
- Build middleware and libraries - Grow the Hono ecosystem.
- Share - Share your thoughts on the Blog, X, and others.
- Sponsor - Support the maintainers through GitHub Sponsors: [@yusukebe](https://github.com/sponsors/yusukebe) and [@usualoma](https://github.com/sponsors/usualoma).
- Make your application - Please try to use Hono.

Note:
This project is started by Yusuke Wada ([@yusukebe](https://github.com/yusukebe)) for the hobby proposal.
It was just for fun. For now, this stance has not been changed basically.
I want to write the code as I like.
So, if you propose great ideas, but I do not appropriate them, the idea may not be accepted.

Although, don't worry!
Hono is tested well, polished by the contributors, and used by many developers. And I'll try my best to make Hono cool and hot, beautiful, and ultrafast.

## AI Usage Policy

You may use AI to contribute, but it must never waste a maintainer's time or make their work unpleasant.

To enforce this, and regardless of whether AI was actually used, a maintainer may close your issue without notice and block your account.

## Issues instead of Pull Requests

Pull requests are limited to maintainers. If you find a bug or want a change, please create an issue instead. A clear issue with a minimal reproduction helps us more than a pull request.

If you have already fixed it in your fork, you can link the branch in the issue. A maintainer may open a pull request from it, and your commits keep your name.

## Local Development

The `honojs/hono` project uses [pnpm](https://pnpm.io/) as its package manager, and [Bun](https://bun.sh/) to run the build and some of the tests. Developers should install both.

```bash
git clone git@github.com:honojs/hono.git && cd hono && pnpm install --frozen-lockfile
```
