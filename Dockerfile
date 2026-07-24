# Backend Dockerfile for Render Deployment
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install server dependencies
RUN cd server && npm install --production

# Copy application source code
COPY . .

# Set working directory to server
WORKDIR /app/server

EXPOSE 8000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8000

CMD ["node", "server.js"]