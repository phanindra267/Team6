# ── Backend Dockerfile ─────────────────────────────────────────────────────────
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
