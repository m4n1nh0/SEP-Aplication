FROM node:20-alpine AS server-deps

WORKDIR /app

COPY server/package*.json server/
RUN npm ci --prefix server

FROM server-deps AS server-build

COPY server server
RUN npm run build --prefix server

FROM node:20-alpine AS client-build

WORKDIR /app

COPY client/package*.json client/
RUN npm ci --prefix client

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY client client
RUN npm run build --prefix client

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    SERVE_CLIENT=true \
    CLIENT_DIST_DIR=/app/client/dist \
    LOG_DIR=/app/logs \
    UPLOAD_DIR=/app/uploads

COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server \
  && npm cache clean --force

COPY --from=server-build /app/server/dist server/dist
COPY --from=client-build /app/client/dist client/dist
COPY database database
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/logs /app/uploads \
  && chown -R node:node /app

USER node

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
