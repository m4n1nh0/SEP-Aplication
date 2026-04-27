FROM node:20-alpine AS deps

WORKDIR /app

COPY server/package*.json server/
RUN npm ci --prefix server

FROM deps AS build

COPY server server
RUN npm run build --prefix server

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    SERVE_CLIENT=false \
    LOG_DIR=/app/logs \
    UPLOAD_DIR=/app/uploads

COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server \
  && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY database database
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/logs /app/uploads \
  && chown -R node:node /app

USER node

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]