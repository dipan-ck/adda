# # ---------- DEPENDENCY STAGE ----------
# FROM node:20-bookworm AS deps

# WORKDIR /app

# RUN apt-get update && apt-get install -y \
#     python3 \
#     make \
#     g++ \
#     && rm -rf /var/lib/apt/lists/*

# COPY package*.json ./

# RUN npm ci


# # ---------- BUILD STAGE ----------
# FROM node:20-bookworm AS build

# WORKDIR /app

# COPY --from=deps /app/node_modules ./node_modules
# COPY tsconfig.json ./
# COPY src ./src

# RUN npx tsc


# # ---------- LIBRARY STAGE ----------
# # collect runtime libraries needed by mediasoup worker
# FROM node:20-bookworm AS libs

# RUN apt-get update && apt-get install -y \
#     libsrtp2-1 \
#     libssl3 \
#     libuv1 \
#     libopus0 \
#     libvpx7 \
#     && rm -rf /var/lib/apt/lists/*


# # ---------- DISTROLESS RUNTIME ----------
# FROM gcr.io/distroless/nodejs20-debian12

# WORKDIR /app

# ENV NODE_ENV=production

# COPY --from=build /app/dist ./dist
# COPY --from=deps /app/node_modules ./node_modules
# COPY package*.json ./

# # copy required shared libraries
# COPY --from=libs /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu
# COPY --from=libs /lib/x86_64-linux-gnu /lib/x86_64-linux-gnu

# EXPOSE 8008
# EXPOSE 40000-40100/udp
# EXPOSE 40000-40100/tcp

# CMD ["dist/server.js"]




# ---------- BUILD STAGE ----------
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
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["node", "dist/server.js"]
