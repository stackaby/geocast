FROM node:25-alpine3.22

WORKDIR /app

# Install the requirements
# three.js, vite, ws, etc.
ARG DEV
ARG BACKEND=${DEV:+.}
ARG BACKEND=${BACKEND:-../dist}
COPY ./package.json ./package-lock.json ${BACKEND}/src/server.ts .

RUN npm install

EXPOSE 8080

CMD ["tsx", "watch", "server.ts"]
