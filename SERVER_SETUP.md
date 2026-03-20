# Server Setup Guide for Farmer Marketplace

This guide helps you prepare the server for automated deployment from GitHub Actions.

## Prerequisites

On your server:
- Ubuntu/Debian-based system (or similar Linux distro)
- Docker and Docker Compose installed
- SSH access

---

## Step 1: Install Docker (if not already installed)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

---

## Step 2: Create Project Directory on Server

```bash
# Create directory for the application
sudo mkdir -p /opt/farmer-marketplace
sudo chown $USER:$USER /opt/farmer-marketplace

# Navigate to it
cd /opt/farmer-marketplace
```

---

## Step 3: Set Up SSH Key for GitHub Actions

```bash
# Generate SSH key pair (no passphrase)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions -N ""

# Copy the public key to authorized_keys
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (copy this value)
cat ~/.ssh/github-actions
```

---

## Step 4: Create .env File on Server

```bash
# Create environment file
nano /opt/farmer-marketplace/.env

# Add these values:
```

```env
MONGO_URI=your-mongodb-atlas-connection-string-here
NODE_ENV=production
```

---

## Step 5: Create docker-compose.prod.yml on Server

```bash
nano /opt/farmer-marketplace/docker-compose.prod.yml
```

Copy the contents from your repository: `docker-compose.prod.yml`

---

## Step 6: Test Docker Setup Locally

```bash
# Test pulling and running images
cd /opt/farmer-marketplace
docker pull subodhsingh20/farmer-marketplace-backend:latest
docker pull subodhsingh20/farmer-marketplace-frontend:latest

# Dry run - start containers
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Stop containers
docker compose -f docker-compose.prod.yml down
```

---

## Step 7: Add GitHub Secrets (in your GitHub repo settings)

Go to: Repository → Settings → Secrets and variables → Actions

Add these **3 new secrets**:

| Secret Name | Value |
|------------|-------|
| `SERVER_HOST` | Your server IP address (e.g., `192.168.1.100` or domain) |
| `SERVER_USER` | Username on server (e.g., `ubuntu`, `root`, or your created user) |
| `SERVER_SSH_KEY` | **Full private key** from `~/.ssh/github-actions` (the entire key, including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) |
| `MONGO_URI` | Your MongoDB Atlas connection string |

---

## Step 8: Test the Pipeline

1. Push a commit to the `main` branch:
   ```bash
   git add .
   git commit -m "Setup: Enable automated deployment"
   git push origin main
   ```

2. Go to GitHub repo → Actions tab

3. Watch the workflow run:
   - ✅ Builds backend image
   - ✅ Builds frontend image
   - ✅ Pushes to Docker Hub
   - ✅ SSH connects to server
   - ✅ Pulls latest images
   - ✅ Restarts containers

4. Check server:
   ```bash
   docker ps  # Should show backend and frontend running
   docker logs -f farmer-marketplace-backend-1
   ```

---

## Access Your App

- **Frontend**: `http://your-server-ip`
- **Backend API**: `http://your-server-ip:5000`

---

## Troubleshooting

### SSH Connection Fails
- Verify `SERVER_HOST` is correct
- Check `SERVER_USER` exists on server
- Ensure private key is complete (including BEGIN/END lines)

### Images don't pull
- Verify Docker Hub username/token are correct
- Check Docker credentials: `docker login`

### Containers won't start
- Check logs: `docker compose -f docker-compose.prod.yml logs`
- Verify `MONGO_URI` is set and accessible
- Ensure ports 80 and 5000 are not in use

---

## Additional Commands

```bash
# View running containers
docker ps

# View logs
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop everything
docker compose -f docker-compose.prod.yml down

# Check disk usage
docker system df
```