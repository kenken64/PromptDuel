FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json package-lock.json* ./
RUN npm ci

# Build application
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
