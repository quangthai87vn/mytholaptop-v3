# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm and medusa CLI globally
RUN npm install -g pnpm@9 @medusajs/cli@2.15.3 ts-node

# Configure pnpm to hoist all packages
RUN pnpm config set shamefully-hoist true --location=global

# Copy workspace files
COPY pnpm-lock.yaml ./pnpm-lock.yaml
COPY pnpm-workspace.yaml ./

# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Install dependencies (include devDependencies for build)
RUN NODE_ENV=development pnpm install

# Copy backend source
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Set NODE_ENV for build
ENV NODE_ENV=development

# Build Medusa - output will be in /app/apps/backend/.medusa
RUN medusa build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 medusa

# Copy built artifacts - Medusa 2.x output is in /app/apps/backend/.medusa
COPY --from=builder /app/apps/backend/.medusa /app/medusa
COPY --from=builder /app/apps/backend/package.json /app/package.json
COPY --from=builder /app/apps/backend/tsconfig.json /app/tsconfig.json

# Copy node_modules from workspace root (needed for runtime)
COPY --from=builder /app/node_modules /app/node_modules

# Install pnpm and medusa CLI globally for running
RUN npm install -g pnpm@9 @medusajs/cli@2.15.3

# Create medusa user and set ownership in ONE layer
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 medusa && \
    chown -R medusa:medusa /app/medusa/server/.medusa 2>/dev/null || true

USER medusa

EXPOSE 9000
ENV PORT=9000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app/medusa/server

CMD ["medusa", "start"]
