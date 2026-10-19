FROM nginx:1.27.1-alpine AS proxy
RUN apk add --no-cache apache2-utils
COPY deployment/railway/15-demo-access.sh /docker-entrypoint.d/15-demo-access.sh
RUN chmod +x /docker-entrypoint.d/15-demo-access.sh
COPY deployment/railway/default.conf.template /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER="^(PORT|API_PRIVATE_HOST|API_PRIVATE_PORT)$"
EXPOSE 8080

FROM node:22.15.0-alpine AS build
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH" PUPPETEER_SKIP_DOWNLOAD=true HUSKY=0
RUN npm install -g pnpm@10.22.0
WORKDIR /app
COPY . .
ARG VITE_APP_URL
ARG VITE_API_URL
ARG VITE_DEMONSTRATION_MODE=true
ENV VITE_GOOGLE_OAUTH_ENABLED=false VITE_MICROSOFT_OAUTH_ENABLED=false VITE_SLACK_OAUTH_ENABLED=false
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm -w packages:build && pnpm build --filter=web

FROM proxy AS release
COPY --from=build /app/apps/web/build/client /usr/share/nginx/html
