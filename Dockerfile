FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Build Vite client assets
RUN npm run build

# Prune dev dependencies to keep image lean
RUN npm prune --production

# -------------------------------------------------------------
# Runtime stage
# -------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100

# Install runtime SQLite libraries if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy built assets and production node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/banner.jpg ./banner.jpg

# Persistent data directory for SQLite database
VOLUME ["/app/data"]
ENV DB_PATH=/app/data/contributions.db

EXPOSE 3100

CMD ["npm", "start"]
