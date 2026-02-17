### --- Base image versions --- ###
FROM node:20-alpine AS base

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

# ==========================================================
# Build arguments for environment variables (QSIGN MAIN ENVS)
# ==========================================================

# Auth
ARG AUTH_GOOGLE_ID
ARG AUTH_GOOGLE_SECRET
ARG AUTH_SECRET
ARG AUTH_TRUST_HOST
ARG AUTH_URL

# Database
ARG DATABASE_URL

# Email Configuration
ARG EMAIL_FROM_NAME
ARG EMAIL_FROM
ARG EMAIL_HOST
ARG EMAIL_PASS
ARG EMAIL_PORT
ARG EMAIL_USER

# Maps
ARG GOOGLE_MAPS_API_KEY

# Payment (HitPay)
ARG HITPAY_API_KEY
ARG HITPAY_API_URL
ARG HITPAY_WEBHOOK_SALT

# KYC (HyperVerge)
ARG HYPERVERGE_API_URL
ARG HYPERVERGE_APP_ID
ARG HYPERVERGE_APP_KEY
ARG HYPERVERGE_DIRECT_LIVENESS_ENABLED
ARG HYPERVERGE_WORKFLOW_ID

# Server Configuration
ARG NODE_ENV
ARG PORT
ARG SEED_VALUE

# Storage (Supabase)
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY

# Video SDK (Meetings)
ARG NEXT_PUBLIC_VIDEO_SDK_API_KEY
ARG VIDEO_SDK_API_KEY
ARG VIDEO_SDK_SECRET

# Public Site URL
ARG NEXT_PUBLIC_SITE_URL

# ==========================================================
# Environment variables
# ==========================================================

# Auth
ENV AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
ENV AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
ENV AUTH_SECRET=${AUTH_SECRET}
ENV AUTH_TRUST_HOST=${AUTH_TRUST_HOST:-true}
ENV AUTH_URL=${AUTH_URL}

# Database
ENV DATABASE_URL=${DATABASE_URL}

# Email Configuration
ENV EMAIL_FROM_NAME=${EMAIL_FROM_NAME}
ENV EMAIL_FROM=${EMAIL_FROM}
ENV EMAIL_HOST=${EMAIL_HOST}
ENV EMAIL_PASS=${EMAIL_PASS}
ENV EMAIL_PORT=${EMAIL_PORT}
ENV EMAIL_USER=${EMAIL_USER}

# Maps
ENV GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}

# Payment (HitPay)
ENV HITPAY_API_KEY=${HITPAY_API_KEY}
ENV HITPAY_API_URL=${HITPAY_API_URL}
ENV HITPAY_WEBHOOK_SALT=${HITPAY_WEBHOOK_SALT}

# KYC (HyperVerge)
ENV HYPERVERGE_API_URL=${HYPERVERGE_API_URL}
ENV HYPERVERGE_APP_ID=${HYPERVERGE_APP_ID}
ENV HYPERVERGE_APP_KEY=${HYPERVERGE_APP_KEY}
ENV HYPERVERGE_DIRECT_LIVENESS_ENABLED=${HYPERVERGE_DIRECT_LIVENESS_ENABLED}
ENV HYPERVERGE_WORKFLOW_ID=${HYPERVERGE_WORKFLOW_ID}

# Server Configuration
ENV NODE_ENV=${NODE_ENV:-production}
ENV PORT=${PORT:-3000}
ENV SEED_VALUE=${SEED_VALUE}

# Storage (Supabase)
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Video SDK (Meetings)
ENV NEXT_PUBLIC_VIDEO_SDK_API_KEY=${NEXT_PUBLIC_VIDEO_SDK_API_KEY}
ENV VIDEO_SDK_API_KEY=${VIDEO_SDK_API_KEY}
ENV VIDEO_SDK_SECRET=${VIDEO_SDK_SECRET}

# Public Site URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Build Configuration
ENV SKIP_ENV_VALIDATION=1
ENV ENABLE_STANDALONE=true

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

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
