FROM node:8

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY bower.json /usr/src/app
RUN npm i && npm run-script bower -- --allow-root i

COPY . /usr/src/app
RUN npm run-script pulp build

ENTRYPOINT [ "node", "app.js" ]
