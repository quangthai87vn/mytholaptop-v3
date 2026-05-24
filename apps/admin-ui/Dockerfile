# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy source files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy remaining source
COPY . .

# Build Next.js
RUN pnpm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone and static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.example ./.env

# Copy Docker settings (uses http://backend:9000 instead of http://localhost:9000)
COPY --from=builder /app/data/settings.docker.json /app/data/settings.json

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node", "server.js"]
