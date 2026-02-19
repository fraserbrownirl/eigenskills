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

# Install ecloud CLI for EigenCompute
RUN npm install -g @layr-labs/ecloud-cli

# Production deps only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Compiled output from build stage
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV DB_DIR=/data

EXPOSE 3002

CMD ["node", "dist/index.js"]
