ARG NODE_VERSION=22.22.0
FROM node:${NODE_VERSION}-bookworm-slim AS node-runtime

FROM ubuntu:24.04
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
ARG PLAYWRIGHT_VERSION
RUN test -n "${PLAYWRIGHT_VERSION}" && npx --yes "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chromium \
    && npm cache clean --force && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/eloisa-test
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
