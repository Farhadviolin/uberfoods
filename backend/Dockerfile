# Multi-stage build für optimierte Production-Images

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiere package files
COPY package*.json ./
COPY prisma ./prisma/

# Installiere Dependencies
RUN npm ci --legacy-peer-deps

# Kopiere Source Code
COPY . .

# Generiere Prisma Client
RUN npm run prisma:generate

# Build Application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Installiere nur Production Dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Kopiere gebaute App und Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Erstelle Upload-Verzeichnisse
RUN mkdir -p uploads/restaurants uploads/dishes uploads/reviews logs

# Non-root User für Security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

# Health Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.prod.js"]

