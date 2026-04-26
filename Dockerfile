FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY server/package*.json server/
COPY client/package*.json client/

RUN npm ci \
  && npm ci --prefix server \
  && npm ci --prefix client

FROM deps AS build

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    SERVE_CLIENT=true \
    LOG_DIR=/app/logs \
    UPLOAD_DIR=/app/uploads

COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server \
  && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
COPY database database
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/logs /app/uploads \
  && chown -R node:node /app

USER node

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
