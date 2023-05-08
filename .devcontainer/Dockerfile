FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install Deno
ENV DENO_INSTALL=/usr/local
RUN curl -fsSL https://deno.land/install.sh | sh

# Install Bun
ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash

# Install Lagon
RUN yarn global add @lagon/cli esbuild
