FROM node:22.15.0-alpine AS base
ENV PUPPETEER_SKIP_DOWNLOAD=true HUSKY=0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.22.0

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm -w packages:build
RUN pnpm build --filter=api
# TODO: Move pnpm deploy to turbo prune workflow
RUN pnpm deploy --filter=api pnpm-deploy-output --prod --legacy

FROM node:22.15.0-alpine
WORKDIR /app
COPY --from=base /app/pnpm-deploy-output /app
COPY deployment/railway/migrate.mjs /app/release-migrate.mjs
COPY deployment/railway/seed-demo-content.mjs /app/seed-demo-content.mjs
COPY deployment/railway/demo-learner-flow.mjs /app/demo-learner-flow.mjs
COPY deployment/railway/demo-certificate-pdf.mjs /app/demo-certificate-pdf.mjs
COPY deployment/railway/demo-branding-upload.mjs /app/demo-branding-upload.mjs
COPY deployment/railway/demo-scorm-import.mjs /app/demo-scorm-import.mjs
COPY deployment/railway/demo-competencies.mjs /app/demo-competencies.mjs
COPY deployment/railway/demo-public-smoke.mjs /app/demo-public-smoke.mjs
COPY deployment/railway/assets /app/assets
COPY deployment/railway/validate-demo-env.mjs /app/validate-demo-env.mjs

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    xvfb \
    libc6-compat \
    ffmpeg \
    libreoffice \
    && rm -rf /var/cache/apk/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT [ "/app/entrypoint.sh" ]
