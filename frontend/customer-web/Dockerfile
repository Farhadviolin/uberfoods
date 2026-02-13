# Multi-stage build für optimierte Production-Images

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiere package files
COPY package*.json ./

# Installiere Dependencies
RUN npm ci

# Kopiere Source Code
COPY . .

# Build Application
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine

# Kopiere gebaute App
COPY --from=builder /app/dist /usr/share/nginx/html

# Kopiere Nginx Config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

