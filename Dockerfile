# Cloud Run image for the Suncast 3D JSON API (server.js + lib/sun.js).
# The static viewer in public/ is served by Firebase Hosting, not from here.
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Install only production deps (express, suncalc)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App code
COPY server.js ./
COPY lib ./lib

# Cloud Run sets $PORT (usually 8080); server.js already honours it and binds 0.0.0.0
CMD ["node", "server.js"]
