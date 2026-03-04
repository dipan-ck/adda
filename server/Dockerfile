FROM node:20-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc


# ---------- RUNTIME STAGE ----------
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# install only mediasoup runtime libs
RUN apt-get update && apt-get install -y \
    libsrtp2-1 \
    libssl3 \
    libuv1 \
    libopus0 \
    libvpx7 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8008
EXPOSE 42000-42100/udp
EXPOSE 42000-42100/tcp

CMD ["node", "dist/server.js"]
