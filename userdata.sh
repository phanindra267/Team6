#!/bin/bash
set -e

# Update and install dependencies
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# Install Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Setup application
cd /home/ubuntu
git clone https://github.com/phanindra267/Team6.git
cd Team6

# Create .env for backend
cat <<EOT >> backend/.env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/onboarding_db?schema=public
REDIS_URL=redis://redis:6379
SF_MOCK_MODE=true
SF_API_URL=https://api.successfactors.com
SF_CLIENT_ID=mock-client-id
SF_PRIVATE_KEY=mock-private-key
SLACK_MOCK_MODE=true
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW_MS=900000
EOT

# Ensure docker service is running
systemctl enable docker
systemctl start docker

# Run application
docker compose up -d --build
