# Build from the repository root:
#   docker build -f secondchancewebsite/Dockerfile -t secondchancewebsite .

# Stage 1: build the provided React front end
FROM node:20-slim AS build
WORKDIR /frontend
COPY secondChance-frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY secondChance-frontend/ ./
RUN npm run build

# Stage 2: serve the build (and proxy the API) with Express
FROM node:20-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY secondchancewebsite/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY secondchancewebsite/index.js ./
COPY --from=build /frontend/build ./build
EXPOSE 9000
USER node
CMD ["node", "index.js"]
