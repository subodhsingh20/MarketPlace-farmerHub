# Farmer Marketplace

Farmer Marketplace is a full-stack app for connecting customers with nearby farmers, managing product listings, cart/checkout, orders, chat, ratings, and farmer analytics.

## Stack

- Frontend: React, React Router, Axios, Socket.IO client
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO
- Payments: Razorpay in live mode, mock/test payment mode for development

## Repository Structure

- `frontend/` React application
- `backend/` Express API and Socket.IO server
- `docker-compose.yml` local multi-container setup
- `docker-compose.prod.yml` production-oriented compose file

## Environment Variables

### Backend

Copy [backend/.env.example](backend/.env.example) and set:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `PAYMENT_MODE`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

`CLIENT_URL` can be a comma-separated list for multiple allowed origins, for example:

```env
CLIENT_URL=http://localhost:3000,https://your-frontend-domain.up.railway.app
```

### Frontend

Copy [frontend/.env.example](frontend/.env.example) and set:

- `REACT_APP_API_URL`
- `REACT_APP_SOCKET_URL`
- `REACT_APP_PAYMENT_MODE`
- `REACT_APP_RAZORPAY_KEY_ID`
- `REACT_APP_PAYMENT_GATEWAY_URL`

## Local Development

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The API health check is available at `/api/health`.

## Verification Completed

- Backend syntax checks passed on the updated server files
- Frontend production build passed with `npm run build`

## GitHub Readiness Checklist

- `.gitignore` now excludes `node_modules`, build output, logs, and local `.env` files
- Example env files are available for backend and frontend
- Docker compose env variable names were aligned with the app

## Railway Deployment Plan

The cleanest Railway setup is two services from this same GitHub repo.

### 1. Backend Service

- Root directory: `backend`
- Dockerfile path: `backend/Dockerfile` if you deploy the backend as a Docker service
- Build command: `npm install`
- Start command: `npm start`
- Required variables:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CLIENT_URL`
  - `PAYMENT_MODE`
  - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` when using live payments

### 2. Frontend Service

You can deploy the frontend using its Dockerfile.

- Root directory: `frontend`
- Dockerfile path: `frontend/dockerfile`
- Required variables:
  - `REACT_APP_API_URL`
  - `REACT_APP_SOCKET_URL`
  - `REACT_APP_PAYMENT_MODE`
  - `REACT_APP_RAZORPAY_KEY_ID` for live mode

### 3. Cross-Service Wiring

- Set frontend `REACT_APP_API_URL` to your backend Railway URL plus `/api`
- Set frontend `REACT_APP_SOCKET_URL` to your backend Railway URL
- Set backend `CLIENT_URL` to your frontend Railway URL

Example:

```env
REACT_APP_API_URL=https://farmer-marketplace-backend.up.railway.app/api
REACT_APP_SOCKET_URL=https://farmer-marketplace-backend.up.railway.app
CLIENT_URL=https://farmer-marketplace-frontend.up.railway.app
```

## Recommended Next Enhancements

- Add real backend and frontend test coverage for auth, orders, cart, and checkout
- Add centralized input validation with a schema library
- Add rate limiting and security headers for production API traffic
- Add a CI workflow that runs backend checks and frontend build on each push
- Add image upload/storage instead of relying on pasted image URLs
