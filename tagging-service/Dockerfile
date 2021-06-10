FROM node:12-alpine AS base
LABEL NAME="tagging-service"
LABEL MAINTAINER James Weber "james.weber@cloudecosystem.org"

WORKDIR /usr/src/tagging-service

RUN apk add --no-cache bash

COPY package.json yarn.lock ./
COPY package.json ./services/tagging-service/
COPY app services/tagging-service/app
# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/tagging-service/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/tagging-service", "start"]
