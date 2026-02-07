FROM node:20-alpine AS base
WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3001

# Set as environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Install dependencies
FROM base AS install
COPY package.json package-lock.json* bun.lockb* ./
RUN npm ci || npm install

# Build application
FROM base AS build
# Re-declare ARGs for this stage
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
