FROM oven/bun:1.4.0-debian AS dependencies
WORKDIR /workspace
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN bun run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /workspace/.next/standalone ./
COPY --from=build --chown=node:node /workspace/.next/static ./.next/static
COPY --from=build --chown=node:node /workspace/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
