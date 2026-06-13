# 🌾 Farmer Marketplace

A production-grade, full-stack marketplace that connects customers directly with nearby farmers — enabling product discovery, real-time chat, seamless checkout, and farmer analytics in one platform.

**Live Demo:** [farmer-marketplace.amplifyapp.com](https://main.d2rlq4a76ba9ai.amplifyapp.com)

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Important Notes](#important-notes)

---

## Overview

Farmer Marketplace is a full-stack web application built to bridge the gap between local farmers and customers. Farmers can manage their product listings, track orders, and view sales analytics — while customers can browse nearby produce, place orders, and communicate with farmers in real time.

The platform is deployed on AWS Amplify (frontend) and Render (backend), with IBM Cloudant as the cloud database and a GitHub Actions + Docker Hub pipeline handling automated container builds.

---

## ✨ Features

### Customer
- Browse and search nearby farmer products
- Voice search powered by IBM Speech to Text
- Add to cart, manage addresses, and checkout
- Real-time order tracking and status updates
- Rate and review farmers

### Farmer
- Dashboard for product, order, and chat management
- Analytics for sales performance and order trends
- Real-time notifications via WebSockets

### Platform
- JWT-based authentication for both customers and farmers
- Real-time communication via Socket.IO
- IBM Cloudant-backed persistence (users, products, orders, chat)
- Simulated checkout flow with test mode payment processing
- Geolocation-based farmer discovery via Leaflet Maps

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router, Axios, Framer Motion, Leaflet |
| **Backend** | Node.js, Express 5, Socket.IO, JWT, bcryptjs |
| **Database** | IBM Cloudant (NoSQL) |
| **Payments** | Test Mode (simulated payment flow) |
| **Voice Search** | IBM Speech to Text |
| **Containerization** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions, Docker Hub |
| **Deployment** | AWS Amplify (frontend), Render (backend) |

---

## 📁 Repository Structure

```
farmer-marketplace/
├── frontend/                       # React application
├── backend/                        # Express API & Socket.IO server
├── .github/
│   └── workflows/
│       ├── deploy.yml              # Docker build & push pipeline
│       └── cicd.yml                # IBM Event Notifications pipeline (optional)
├── docker-compose.yml              # Local multi-container setup
└── docker-compose.prod.yml         # Production Docker Compose setup
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Docker & Docker Compose
- IBM Cloudant instance
- IBM Speech to Text instance (for voice search)

### Local Development

**1. Clone the repository**

```bash
git clone https://github.com/subodhsingh20/farmer-marketplace.git
cd farmer-marketplace
```

**2. Configure environment variables**

Copy the example env files and fill in your credentials:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**3. Start the backend**

```bash
cd backend
npm install
npm start
```

**4. Start the frontend**

```bash
cd frontend
npm install
npm start
```

**5. Verify the backend is running**

```
GET /api/health
```

> Alternatively, use Docker Compose for a unified local setup:
> ```bash
> docker compose up
> ```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Port the backend server runs on |
| `CLOUDANT_URL` | IBM Cloudant instance URL |
| `CLOUDANT_API_KEY` | IBM Cloudant API key |
| `CLOUDANT_DB_PREFIX` | Database namespace prefix (e.g. `farmer_marketplace`) |
| `JWT_SECRET` | Secret key for JWT token signing |
| `CLIENT_URL` | Allowed frontend origin(s) — comma-separated for multiple |
| `PAYMENT_MODE` | Set to `test` for simulated payment flow |
| `IBM_STT_APIKEY` | IBM Speech to Text API key |
| `IBM_STT_URL` | IBM Speech to Text service URL |
| `IBM_STT_MODEL` | STT model (recommended: `en-US`) |

> `CLIENT_URL` also accepts `CLIENT_ORIGIN` or `CORS_ALLOWED_ORIGINS` as aliases.

**Example:**
```env
PORT=5000
CLOUDANT_URL=https://YOUR-ACCOUNT.cloudantnosqldb.appdomain.cloud
CLOUDANT_API_KEY=YOUR_CLOUDANT_API_KEY
CLOUDANT_DB_PREFIX=farmer_marketplace
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET
CLIENT_URL=http://localhost:3000,https://your-app.amplifyapp.com
PAYMENT_MODE=test
IBM_STT_APIKEY=YOUR_IBM_STT_API_KEY
IBM_STT_URL=https://api.au-syd.speech-to-text.watson.cloud.ibm.com/instances/YOUR_INSTANCE_ID
IBM_STT_MODEL=en-US
```

---

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL |
| `REACT_APP_SOCKET_URL` | Backend Socket.IO URL |
| `REACT_APP_PAYMENT_MODE` | Set to `test` for simulated payment flow |

**Example (for AWS Amplify):**
```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend.onrender.com
REACT_APP_PAYMENT_MODE=test
```

---

## ☁️ Deployment

### Recommended Production Setup

| Layer | Platform |
|---|---|
| Frontend | AWS Amplify |
| Backend | Render |
| Database | IBM Cloudant |

### Docker Deployment

For server-based deployments using Docker Compose:

```bash
# Pull the latest images
docker compose -f docker-compose.prod.yml pull

# Start all services in detached mode
docker compose -f docker-compose.prod.yml up -d
```

**Docker Hub Images:**
- `subodhsingh20/farmer-marketplace-backend:latest`
- `subodhsingh20/farmer-marketplace-frontend:latest`

---

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automates the entire build and push process:

- **On push to `main`:** Builds backend and frontend Docker images, injects frontend build args from GitHub repository variables/secrets, and pushes images to Docker Hub.
- **On pull requests:** Validates image builds without pushing.

### Optional: IBM Event Notifications Pipeline

If using `.github/workflows/cicd.yml`, add the following repository secrets:

| Secret | Description |
|---|---|
| `IBM_EVENT_NOTIFICATIONS_API_KEY` | IBM Event Notifications API key |
| `IBM_EVENT_NOTIFICATIONS_INSTANCE_ID` | IBM EN instance ID |
| `IBM_REGION` | IBM Cloud region |

---

## 📝 Important Notes

- **Never commit `backend/.env`** — it contains secrets. Ensure it is listed in `.gitignore`.
- Use `CLOUDANT_DB_PREFIX=farmer_marketplace` unless you intentionally need a different database namespace.
- Payment is currently running in **test mode** — no real transactions are processed.
- Voice search requires a **secure context** (HTTPS or `localhost`) due to browser microphone access restrictions.
- For best transcription quality, keep `IBM_STT_MODEL` set to `en-US` unless you specifically require a different language model.
- The frontend safely handles empty or malformed featured product API responses without crashing.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
