# syntax=docker/dockerfile:1

# ---- build: install dependencies and produce the static site -----------------
# Debian (glibc) rather than Alpine: Vite, Tailwind and the linters ship native
# binaries, and their glibc builds are the ones exercised most widely.
FROM node:22-slim AS build
WORKDIR /app

# Copy the manifests first: `npm ci` stays cached until dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- test: `docker compose --profile test run --rm frontend-tests` -----------
FROM build AS test
CMD ["npm", "test"]

# ---- runtime: nginx serving the built files (default target) -----------------
FROM nginx:1.27-alpine AS runtime

# Default backend URL; override it with the same variable when starting the container.
ENV VITE_API_BASE_URL=http://localhost:8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
