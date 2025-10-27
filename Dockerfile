### --- Base image versions --- ###
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps

# System deps for Next.js/Prisma on Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install Node dependencies with pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG AUTH_SECRET
ARG AUTH_URL
ARG DATABASE_URL
ARG EMAIL_FROM
ARG EMAIL_FROM_NAME
ARG EMAIL_HOST
ARG EMAIL_PASS
ARG EMAIL_PORT
ARG EMAIL_USER

# Environment variables
ENV NODE_ENV production
# ENV NEXT_TELEMETRY_DISABLED 1
# ENV NPM_CONFIG_FUND false
# ENV NPM_CONFIG_AUDIT false
ENV AUTH_TRUST_HOST true
ENV AUTH_SECRET=${AUTH_SECRET}
ENV AUTH_URL=${AUTH_URL}
ENV DATABASE_URL=${DATABASE_URL}
ENV EMAIL_FROM_NAME=${EMAIL_FROM_NAME}
ENV EMAIL_FROM=${EMAIL_FROM}
ENV EMAIL_HOST=${EMAIL_HOST}
ENV EMAIL_PASS=${EMAIL_PASS}
ENV EMAIL_PORT=${EMAIL_PORT}
ENV EMAIL_USER=${EMAIL_USER}
ENV SKIP_ENV_VALIDATION 1

# Build the project and its dependencies
RUN corepack enable pnpm && pnpm db:generate && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]