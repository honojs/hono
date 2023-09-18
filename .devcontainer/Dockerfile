FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install Deno
ENV DENO_INSTALL=/usr/local
RUN curl -fsSL https://gist.githubusercontent.com/LukeChannings/09d53f5c364391042186518c8598b85e/raw/ac8cd8c675b985edd4b3e16df63ffef14d1f0e24/deno_install.sh | sh

# Install Bun
ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash

# Install Lagon
RUN yarn global add @lagon/cli esbuild
