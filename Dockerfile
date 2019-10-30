# hub.docker.com/r/_/node/
FROM node:lts-alpine as builder
WORKDIR /app

# "bcrypt" requires python/make/g++, all must be installed in alpine
# (note: using pinned versions to ensure immutable build environment)
RUN echo "https://mirrors.aliyun.com/alpine/v3.9/main/" > /etc/apk/repositories && \
    echo "https://mirrors.aliyun.com/alpine/v3.9/community/" >> /etc/apk/repositories && \
    apk update && \
    apk upgrade && \
    apk add python=2.7.16-r1 && \
    apk add make=4.2.1-r2 && \
    apk add g++=8.3.0-r0

COPY . /app

# Use "Continuous Integration" to install as-is from package-lock.json
RUN npm i --registry=https://registry.npm.taobao.org


FROM node:lts-alpine
COPY --from=builder /app /app
WORKDIR /app

# Set this to inspect more from the application. Examples:
#   DEBUG=formio:db (see index.js for more)
#   DEBUG=formio:*
ENV DEBUG=""

# This will initialize the application based on
# some questions to the user (login email, password, etc.)
ENTRYPOINT [ "node", "main" ]
