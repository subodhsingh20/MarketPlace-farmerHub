# Frontend Dockerfile (Multi-stage build)
# react-router-dom@7 and React 19 requires Node >= 20
FROM node:20-alpine AS build

ARG REACT_APP_API_URL=http://localhost:5000/api
ARG REACT_APP_SOCKET_URL=http://localhost:5000
ARG REACT_APP_PAYMENT_MODE=test
ARG REACT_APP_RAZORPAY_KEY_ID=
ARG REACT_APP_PAYMENT_GATEWAY_URL=https://checkout.razorpay.com/v1/checkout.js

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
ENV REACT_APP_PAYMENT_MODE=$REACT_APP_PAYMENT_MODE
ENV REACT_APP_RAZORPAY_KEY_ID=$REACT_APP_RAZORPAY_KEY_ID
ENV REACT_APP_PAYMENT_GATEWAY_URL=$REACT_APP_PAYMENT_GATEWAY_URL

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use npm install to avoid lockfile mismatch issues inside container
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Support React Router SPA routes in production
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
