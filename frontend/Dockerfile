FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts ./

# Build
RUN npm run build

# Production image
FROM node:24-alpine

WORKDIR /app

# Install serve to run the built app
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Start
CMD ["serve", "-s", "dist", "-l", "5173"]
