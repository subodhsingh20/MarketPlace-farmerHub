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
CLIENT_URL=http://localhost:3000,http://your-server-ip
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

## Docker Deployment Plan

This project is set up for a GitHub-to-Docker pipeline using GitHub Actions and Docker Hub.

### GitHub Actions Pipeline

The workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

- builds the backend image from `backend/Dockerfile`
- builds the frontend image from `frontend/Dockerfile`
- pushes both images to Docker Hub on pushes to `main`
- validates that images still build on pull requests without pushing

### Docker Hub Images

The current workflow pushes:

- `subodhsingh20/farmer-marketplace-backend:latest`
- `subodhsingh20/farmer-marketplace-frontend:latest`

### Production Deployment With Docker Compose

Use [docker-compose.prod.yml](docker-compose.prod.yml) on your server after logging in to Docker Hub:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Required Production Environment Variables

Set these on the server that runs Docker Compose:

- `MONGODB_URI`
- `JWT_SECRET`
- `PAYMENT_MODE`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

If your frontend is served from a custom domain or IP and the backend needs strict CORS, set `CLIENT_URL` in the backend environment to the frontend origin.

### Example Backend CORS Value

```env
CLIENT_URL=http://localhost:3000,http://your-server-ip
```

## Recommended Next Enhancements

- Add real backend and frontend test coverage for auth, orders, cart, and checkout
- Add centralized input validation with a schema library
- Add rate limiting and security headers for production API traffic
- Add a CI workflow that runs backend checks and frontend build on each push
- Add image upload/storage instead of relying on pasted image URLs
