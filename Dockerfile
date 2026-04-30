# Build frontend
FROM node:25-alpine3.22 AS frontend-build
WORKDIR /app

# Copy yarn configuration and lockfile
COPY .yarn ./.yarn
COPY yarn.lock ./

# Use node-modules linker instead of PnP for Docker compatibility
RUN cat > .yarnrc.yml << 'EOF'
yarnPath: .yarn/releases/yarn-4.13.0.cjs
enableGlobalCache: false
nodeLinker: node-modules
EOF

# Copy all package.json files for workspace resolution
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install dependencies
RUN yarn install --immutable

# Copy frontend source and build
COPY frontend ./frontend/
RUN yarn workspace frontend build

# Build backend
FROM node:25-alpine3.22 AS backend-build
WORKDIR /app

# Copy yarn configuration and lockfile
COPY .yarn ./.yarn
COPY yarn.lock ./

# Use node-modules linker instead of PnP for Docker compatibility
RUN cat > .yarnrc.yml << 'EOF'
yarnPath: .yarn/releases/yarn-4.13.0.cjs
enableGlobalCache: false
nodeLinker: node-modules
EOF

# Copy all package.json files for workspace resolution
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install dependencies
RUN yarn install --immutable

# Copy backend source and build
COPY backend ./backend/
RUN yarn workspace backend build

# Final image
FROM node:25-alpine3.22
WORKDIR /app

COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY --from=frontend-build /app/dist ./public

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE ${PORT:-3000}
ENTRYPOINT ["./entrypoint.sh"]
