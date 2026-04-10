FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN chmod +x node_modules/.bin/*

COPY . ./

ARG VITE_BASE_PATH=/Projekt/
ENV VITE_BASE_PATH=$VITE_BASE_PATH

ARG VITE_RECAPTCHA_SITE_KEY=
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

RUN npx vite build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
