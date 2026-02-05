#!/bin/bash

##############################################
# ArcPP AWS Deployment Script
# Quick deployment helper script
##############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   ArcPP Deployment Helper${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to print colored messages
info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

error() {
    echo -e "${RED}✗ ${1}${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Check if running locally or on EC2
if [ -f /sys/hypervisor/uuid ] && [ $(head -c 3 /sys/hypervisor/uuid) == "ec2" ]; then
    ON_EC2=true
else
    ON_EC2=false
fi

##############################################
# LOCAL DEPLOYMENT PACKAGE CREATION
##############################################
if [ "$ON_EC2" = false ]; then
    info "Running on local machine - Creating deployment package"

    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        error "docker-compose.yml not found. Please run this script from the project root."
        exit 1
    fi

    # Create package
    info "Creating deployment package..."
    tar --exclude='node_modules' \
        --exclude='client/node_modules' \
        --exclude='server/node_modules' \
        --exclude='.git' \
        --exclude='client/build' \
        -czf arcpp-web.tar.gz .

    success "Deployment package created: arcpp-web.tar.gz"

    echo ""
    warning "To deploy to EC2, run the following commands:"
    echo ""
    echo "  # Transfer to EC2:"
    echo "  scp -i your-key.pem arcpp-web.tar.gz ubuntu@<EC2-IP>:~/"
    echo ""
    echo "  # SSH into EC2:"
    echo "  ssh -i your-key.pem ubuntu@<EC2-IP>"
    echo ""
    echo "  # Run this script on EC2:"
    echo "  bash deploy.sh"
    echo ""

    exit 0
fi

##############################################
# EC2 DEPLOYMENT
##############################################
info "Running on EC2 - Starting deployment"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    warning "Docker not found. Installing Docker..."

    # Update system
    sudo apt update
    sudo apt upgrade -y

    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh

    # Add user to docker group
    sudo usermod -aG docker $USER

    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    success "Docker installed successfully"
    warning "Please log out and log back in for group changes to take effect"
    warning "Then run this script again"
    exit 0
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose not found. Please install it first."
    exit 1
fi

# Create app directory
APP_DIR="$HOME/arcpp-web"
mkdir -p "$APP_DIR"

# Check if tar file exists
if [ ! -f "$HOME/arcpp-web.tar.gz" ]; then
    error "arcpp-web.tar.gz not found in home directory"
    error "Please transfer the deployment package first"
    exit 1
fi

# Extract files
info "Extracting application files..."
cd "$APP_DIR"
tar -xzf "$HOME/arcpp-web.tar.gz"
success "Files extracted"

# Check if .env exists
if [ ! -f "server/.env" ]; then
    warning "server/.env not found"
    info "Creating template .env file..."

    cat > server/.env << 'EOF'
# MongoDB Connection
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/ArcPP

# Server Configuration
PORT=5000
NODE_ENV=production

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
EOF

    warning "Please edit server/.env with your actual MongoDB connection string"
    echo "  nano server/.env"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
fi

# Stop existing containers if running
if [ "$(docker ps -q -f name=arcpp-)" ]; then
    info "Stopping existing containers..."
    docker-compose down
fi

# Build and start containers
info "Building and starting containers..."
docker-compose up -d --build

# Wait for services to start
info "Waiting for services to start..."
sleep 10

# Check container status
info "Checking container status..."
docker-compose ps

# Test backend health
info "Testing backend health..."
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    success "Backend is healthy"
else
    warning "Backend health check failed (this is normal on first start)"
fi

# Check Redis
info "Checking Redis connection..."
if docker exec arcpp-redis redis-cli PING > /dev/null 2>&1; then
    success "Redis is running"
else
    error "Redis connection failed"
fi

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo ""
success "Deployment complete!"
echo ""
info "Access your application at:"
echo "  http://${PUBLIC_IP}"
echo ""
info "Useful commands:"
echo "  View logs:           docker-compose logs -f"
echo "  Restart services:    docker-compose restart"
echo "  Stop services:       docker-compose down"
echo "  Container status:    docker-compose ps"
echo ""
info "To populate Redis cache, run:"
echo "  docker exec -it arcpp-server node scripts/populateProteinSummaryCache.js"
echo ""
