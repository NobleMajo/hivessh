FROM node:20

WORKDIR /app

COPY package*.json ./
COPY node_modules ./
RUN npm ci

COPY . .

RUN npm run build

ENTRYPOINT ["npm", "run", "testl"]
