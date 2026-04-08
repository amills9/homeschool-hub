# ============================================================
# Homeschool Hub — Backend Dockerfile
# Node.js 20 Alpine — small and fast
# ============================================================
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files first (layer cache — only reinstalls when deps change)
COPY backend/package*.json ./
# Generate fresh lock file then install — avoids stale package-lock.json issues
RUN npm install --omit=dev

# Copy source
COPY backend/src/ ./src/
COPY db/init.sql  ./db/init.sql

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

# dumb-init ensures Node receives SIGTERM correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
