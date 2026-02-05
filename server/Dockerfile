# Build stage for server
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy dependencies and code from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app .

# Expose port
EXPOSE 5000

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Seed Redis then start server
ENTRYPOINT ["sh", "entrypoint.sh"]
