# Farmer Marketplace

A full-stack marketplace that connects customers directly with nearby farmers. Farmers can manage products, track orders, chat with customers, and view sales analytics, while customers can browse nearby produce, place orders, and communicate in real time.

**Live Demo:** [farmer-marketplace.amplifyapp.com](https://main.d2rlq4a76ba9ai.amplifyapp.com)

## Table Of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Important Notes](#important-notes)

## Overview

Farmer Marketplace bridges local farmers and customers with product discovery, real-time chat, checkout, order tracking, ratings, and farmer dashboards.

The platform is deployed on AWS Amplify for the frontend and Render for the backend, with IBM Cloudant as the cloud database and a GitHub Actions plus Docker Hub pipeline for container builds.

## Features

### Customer

- Browse and search nearby farmer products
- Voice search powered by IBM Speech to Text
- Add to cart, manage addresses, and checkout
- Real-time order tracking and status updates
- Rate and review farmers

### Farmer

- Dashboard for product, order, and chat management
- Analytics for sales performance and order trends
- Real-time notifications through WebSockets

### Platform

- JWT-based authentication for customers and farmers
- Real-time communication with Socket.IO
- IBM Cloudant-backed persistence for users, products, orders, and chat messages
- Simulated checkout flow with test mode payment processing
- Geolocation-based farmer discovery with Leaflet Maps

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router, Axios, Framer Motion, Leaflet |
| Backend | Node.js, Express 5, Socket.IO, JWT, bcryptjs |
| Database | IBM Cloudant |
| Payments | Test mode |
| Voice Search | IBM Speech to Text |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions, Docker Hub |
| Deployment | AWS Amplify, Render |

## Repository Structure

```text
farmer-marketplace/
|-- frontend/                       # React application
|-- backend/                        # Express API and Socket.IO server
|-- .github/
|   `-- workflows/
|       |-- deploy.yml              # Docker build and push pipeline
|       `-- cicd.yml                # IBM Event Notifications pipeline, optional
|-- docker-compose.yml              # Local multi-container setup
`-- docker-compose.prod.yml         # Production Docker Compose setup
```

## Getting Started

### Prerequisites

- Node.js v18+
- Docker and Docker Compose
- IBM Cloudant instance
- IBM Speech to Text instance for voice search

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/subodhsingh20/MarketPlace-farmerHub.git
cd MarketPlace-farmerHub
```

2. Configure environment variables:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start the backend:

```bash
cd backend
npm install
npm start
```

4. Start the frontend:

```bash
cd frontend
npm install
npm start
```

5. Verify the backend is running:

```text
GET /api/health
```

You can also use Docker Compose for a unified local setup:

```bash
docker compose up
```

## Environment Variables

### Backend

| Variable | Description |
|---|---|
| `PORT` | Port the backend server runs on |
| `CLOUDANT_URL` | IBM Cloudant instance URL |
| `CLOUDANT_APIKEY` | IBM Cloudant API key |
| `CLOUDANT_DB_NAME` | Cloudant database name, for example `farmer_marketplace` |
| `JWT_SECRET` | Secret key for JWT token signing |
| `CLIENT_URL` | Allowed frontend origins, comma-separated for multiple |
| `PAYMENT_MODE` | Set to `test` for simulated payment flow |
| `RAZORPAY_KEY_ID` | Razorpay key ID, if live payments are enabled |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret, if live payments are enabled |
| `IBM_STT_APIKEY` | IBM Speech to Text API key |
| `IBM_STT_URL` | IBM Speech to Text service URL |
| `IBM_STT_MODEL` | STT model, recommended `en-US` |

`CLIENT_URL` also accepts `CLIENT_ORIGIN` or `CORS_ALLOWED_ORIGINS` as aliases.

Example:

```env
PORT=5000
CLOUDANT_URL=https://YOUR-ACCOUNT.cloudantnosqldb.appdomain.cloud
CLOUDANT_APIKEY=YOUR_CLOUDANT_API_KEY
CLOUDANT_DB_NAME=farmer_marketplace
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET
CLIENT_URL=http://localhost:3000,https://your-app.amplifyapp.com
PAYMENT_MODE=test
IBM_STT_APIKEY=YOUR_IBM_STT_API_KEY
IBM_STT_URL=https://api.au-syd.speech-to-text.watson.cloud.ibm.com/instances/YOUR_INSTANCE_ID
IBM_STT_MODEL=en-US
```

The backend still accepts the older `CLOUDANT_API_KEY` and `CLOUDANT_DB_PREFIX` names for compatibility.

### Frontend

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL |
| `REACT_APP_SOCKET_URL` | Backend Socket.IO URL |
| `REACT_APP_PAYMENT_MODE` | Set to `test` for simulated payment flow |
| `REACT_APP_RAZORPAY_KEY_ID` | Razorpay frontend key ID, if live payments are enabled |
| `REACT_APP_PAYMENT_GATEWAY_URL` | Razorpay checkout script URL |

Example for AWS Amplify:

```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend.onrender.com
REACT_APP_PAYMENT_MODE=test
REACT_APP_RAZORPAY_KEY_ID=
REACT_APP_PAYMENT_GATEWAY_URL=https://checkout.razorpay.com/v1/checkout.js
```

## Database Setup

Cloudant does not use folders or collections. This app stores typed documents in the configured database and includes a setup script that creates the database structure marker plus useful design document views.

Run this after creating or replacing the Cloudant instance:

```bash
npm --prefix backend run setup:db
```

Verify read/write/delete access:

```bash
npm --prefix backend run test:db
```

The app uses these logical document groups:

- `users`
- `products`
- `orders`
- `chatMessages`

## Deployment

### Recommended Production Setup

| Layer | Platform |
|---|---|
| Frontend | AWS Amplify |
| Backend | Render |
| Database | IBM Cloudant |

### Docker Deployment

For server-based deployments using Docker Compose:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Docker Hub images:

- `subodhsingh20/farmer-marketplace-backend:latest`
- `subodhsingh20/farmer-marketplace-frontend:latest`

## CI/CD Pipeline

The GitHub Actions workflow in `.github/workflows/deploy.yml` automates Docker image builds and pushes.

- On push to `main`: builds backend and frontend Docker images, injects frontend build args from GitHub repository variables/secrets, and pushes images to Docker Hub.
- On pull requests: validates image builds without pushing.

If using `.github/workflows/cicd.yml`, add these repository secrets:

| Secret | Description |
|---|---|
| `IBM_EVENT_NOTIFICATIONS_API_KEY` | IBM Event Notifications API key |
| `IBM_EVENT_NOTIFICATIONS_INSTANCE_ID` | IBM Event Notifications instance ID |
| `IBM_REGION` | IBM Cloud region |

## Important Notes

- Keep `backend/.env` out of Git because it contains secrets.
- Use `CLOUDANT_DB_NAME=farmer_marketplace` unless you intentionally want a different database name.
- Payment is currently in test mode unless `PAYMENT_MODE=live` and payment keys are configured.
- Voice search requires HTTPS or `localhost` because browsers restrict microphone access.
- Keep `IBM_STT_MODEL=en-US` unless you specifically need another language model.
- The frontend safely handles empty or malformed featured product API responses.
