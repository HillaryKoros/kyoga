# --- Stage 1: build the React app ---
FROM node:20-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
# stats.json is consumed at runtime — copy it from the data dir into public/.
COPY data_cog/stats.json public/stats.json
# URL path the app is served at (e.g. "/kyoga/"). Override at build time.
ARG VITE_BASE="/kyoga/"
ENV VITE_BASE=$VITE_BASE
# Where the app fetches data from (default: same origin under VITE_BASE).
ARG VITE_DATA_BASE=""
ENV VITE_DATA_BASE=$VITE_DATA_BASE
RUN npm run build

# --- Stage 2: serve with nginx ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Bake the data into the image so the container is self-contained.
COPY data_cog/      /usr/share/nginx/html/data_cog/
COPY data_vector/   /usr/share/nginx/html/data_vector/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
