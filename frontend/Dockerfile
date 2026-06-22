# ── Frontend Dockerfile ────────────────────────────────────────────────────────
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config to handle React Router (SPA fallback)
RUN printf 'server {\n\
  listen 80;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  gzip on;\n\
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
  location /api/ {\n\
    proxy_pass http://backend:5000;\n\
    proxy_set_header Host $host;\n\
    proxy_set_header X-Real-IP $remote_addr;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1
