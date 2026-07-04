FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
# Install libc6-compat and openssl for Prisma compatibility
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the package-lock.json
COPY package*.json ./
RUN npm ci

# Stage 2: Build the application
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 3: Runner
FROM base AS runner
# Install openssl for Prisma client to connect to the database
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy package files and modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Push schema, seed the database, and start the Next.js server
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && npm run start"]
