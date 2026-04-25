FROM node:25-alpine3.22

WORKDIR /app

# Install the requirements
# three.js, vite, ws, etc.
ARG DEV
ARG FRONTEND=${DEV:+.}
ARG FRONTEND=${FRONTEND:-../dist}
COPY ./package.json ./package-lock.json ./vite.config.js ${FRONTEND}/index.html ./entrypoint.sh .
COPY ${FRONTEND}/assets/ ./assets/

RUN npm install

EXPOSE 5173

RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
