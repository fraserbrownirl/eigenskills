# Multi-stage: build then production
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Install all deps (including dev for tsc)
COPY package.json package-lock.json* ./
RUN npm install

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Install ecloud CLI (required for EigenCompute deploys)
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://raw.githubusercontent.com/Layr-Labs/eigencloud-tools/master/install-all.sh | bash && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Production deps only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Compiled output from build stage
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV DB_DIR=/data

EXPOSE 3002

CMD ["node", "dist/index.js"]
