# Contribution Guide

Contributions Welcome! We will be grad for your help.
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
Although, don't worry! Hono is tested well and used by many developers. And I'll try my best to make Hono cool, beautiful, and ultrafast.

## Third-party middleware

Third-party middleware is a middleware that depends on other libraries or works only specific environment such as only Cloudflare Workers. For examples:

- GraphQL Server middleware
- Firebase Auth middleware
- Validator middleware

You can make a third-party middleware for Hono by yourself. The repository <https://github.com/honojs/middleware-template> is "_template repository_" which will be helpful for you.

### Repository

If you have a new idea for the middleware, create an issue on "_[github.com/honojs/hono](https://github.com/honojs/hono)_" repository. After discussing it, we (the maintainers of Hono) will make the repository for it and give you the privileges for the repository. For example, if the middleware name is "_hello_", the repository will be:

```
github.com/honojs/hello
```

### npm package

We have "_honojs_" organization on npm repository <https://www.npmjs.com/org/honojs>.

If you want to publish the package under the `@honojs` scope, we invite you to the organization.
Tell us your username of the npm repository.
After that, we will add you the team and create the skelton of yor package.
For example, package name will be:

```
@honojs/hello
```

And then, you can release the package by yourself using such a `yarn publish` command.

Note:
We really want to release it using GitHub Actions, but chose this method because the npm organization does not have the access token.
So, you have to release the package using your individual access token.

### Deno module

Also, you can publish it as Deno module.
We recommend use _denoify_ <https://www.denoify.land> for supporting Deno.
In the case of this repository, run the command first:

```
yarn denoify
```

The source files will be converted into `deno_dist` directory.
It's possible to run the module locally or test it with `deno test`.

Finally, publish the module to `deno.land/x`.
For example, module path will be:

```
https://deno.land/x/hono_hello/mod.ts
```

Setting up steps are below:

1. Go to [deno.land/x](https://deno.land/x) web site.
2. Click the "Publish a module".
3. Input the module name such as "_hono_hello_".
4. Specify subdirectory `deno_dist`.
5. Set up the webhook to deploy.

When push the new tag like `v0.1.0`, it will be distributed:

```
https://deno.land/x/hono_hello@v0.1.0/mod.ts
```

Note:
For setting up the webhook on GitHub, you may need "admin" role.
If you do not have it, we will set it up for you.
