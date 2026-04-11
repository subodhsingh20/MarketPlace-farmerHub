# Farmer Marketplace

Farmer Marketplace is a full-stack marketplace for connecting customers with nearby farmers. It supports product browsing, farmer product management, cart and checkout, orders, chat, ratings, authentication, and farmer analytics.

## Tech Stack

- Frontend: React 19, React Router, Axios, Socket.IO client, Framer Motion, Leaflet
- Backend: Node.js, Express 5, Socket.IO, JWT, bcryptjs
- Database: IBM Cloudant
- Payments: Razorpay in live mode, mock/test mode for development
- Deployment: AWS Amplify for frontend, Render for backend, GitHub Actions and Docker Hub for container builds

## Features

- Customer and farmer authentication
- Farmer dashboard for products, orders, chat, and analytics
- Customer dashboard for shopping, cart, checkout, addresses, and order tracking
- Real-time socket updates
- Cloudant-backed persistence for users, products, orders, and chat messages
- Razorpay payment flow with test and live support

## Repository Structure

- `frontend/` React application
- `backend/` Express API and Socket.IO server
- `.github/workflows/deploy.yml` Docker build and push pipeline
- `docker-compose.yml` local multi-container setup
- `docker-compose.prod.yml` production Docker Compose setup

## Environment Variables

### Backend

Copy [backend/.env.example](backend/.env.example) and set:

- `PORT`
- `CLOUDANT_URL`
- `CLOUDANT_API_KEY`
- `CLOUDANT_DB_PREFIX`
- `JWT_SECRET`
- `CLIENT_URL`
- `PAYMENT_MODE`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

`CLIENT_URL` can be a comma-separated list if you need multiple allowed frontend origins.

Example:

```env
CLIENT_URL=http://localhost:3000,https://your-app.amplifyapp.com
```

The backend also accepts `CLIENT_ORIGIN` or `CORS_ALLOWED_ORIGINS` as aliases.

### Frontend

Copy [frontend/.env.example](frontend/.env.example) and set:

- `REACT_APP_API_URL`
- `REACT_APP_SOCKET_URL`
- `REACT_APP_PAYMENT_MODE`
- `REACT_APP_RAZORPAY_KEY_ID`
- `REACT_APP_PAYMENT_GATEWAY_URL`

Example for AWS Amplify:

```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend.onrender.com
REACT_APP_PAYMENT_MODE=test
REACT_APP_RAZORPAY_KEY_ID=
REACT_APP_PAYMENT_GATEWAY_URL=https://checkout.razorpay.com/v1/checkout.js
```

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

The backend health check is available at:

```text
/api/health
```

## Deployment

### Recommended Production Setup

- Frontend: AWS Amplify
- Backend: Render
- Database: IBM Cloudant

Backend Render environment example:

```env
CLOUDANT_URL=https://YOUR-CLOUDANT-ACCOUNT.cloudantnosqldb.appdomain.cloud
CLOUDANT_API_KEY=YOUR_CLOUDANT_API_KEY
CLOUDANT_DB_PREFIX=farmer_marketplace
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET
CLIENT_URL=https://YOUR-AMPLIFY-DOMAIN.amplifyapp.com
PAYMENT_MODE=test
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Frontend Amplify environment example:

```env
REACT_APP_API_URL=https://YOUR-RENDER-BACKEND.onrender.com/api
REACT_APP_SOCKET_URL=https://YOUR-RENDER-BACKEND.onrender.com
REACT_APP_PAYMENT_MODE=test
REACT_APP_RAZORPAY_KEY_ID=
REACT_APP_PAYMENT_GATEWAY_URL=https://checkout.razorpay.com/v1/checkout.js
```

### Docker Deployment

The repository also includes Docker Compose support for server-based deployments.
Use [docker-compose.prod.yml](docker-compose.prod.yml) after logging in to Docker Hub:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## GitHub Actions Pipeline

The workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

- builds the backend Docker image from `backend/Dockerfile`
- builds the frontend Docker image from `frontend/Dockerfile`
- injects frontend build arguments from GitHub repository variables and secrets
- pushes images to Docker Hub on pushes to `main`
- validates image builds on pull requests

If you use [.github/workflows/cicd.yml](.github/workflows/cicd.yml), add this repository secret:

- `IBM_EVENT_NOTIFICATIONS_API_KEY`

Current image names:

- `subodhsingh20/farmer-marketplace-backend:latest`
- `subodhsingh20/farmer-marketplace-frontend:latest`

## Notes

- Keep `backend/.env` out of Git because it contains secrets
- Use `CLOUDANT_DB_PREFIX=farmer_marketplace` unless you intentionally want a different database namespace
- If you enable live Razorpay, set `PAYMENT_MODE=live` and provide both Razorpay keys on the backend and the frontend key ID
- The frontend now safely handles empty or malformed featured product responses
