FROM node:20-alpine AS build

WORKDIR /app

COPY client/package*.json client/
RUN npm ci --prefix client

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY client client
RUN npm run build --prefix client

FROM caddy:2-alpine AS runtime

ENV PORT=8080

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/client/dist /srv

EXPOSE 8080
