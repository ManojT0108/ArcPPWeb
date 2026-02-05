# AWS Deployment Guide for ArcPP

## Overview

This guide covers deploying the ArcPP protein analysis web application to AWS using Docker containers on EC2.

## Architecture

```
Internet
   ↓
[EC2 Instance]
   ├── Docker Compose
   │   ├── Nginx (Client - React)  → Port 80/443
   │   ├── Node.js (Server)        → Port 5000
   │   └── Redis                   → Port 6379
   └── MongoDB Atlas (external)
```

---

## Cost Breakdown (Monthly)

### Minimal Setup (~$21.50/month)
- **EC2 t3.small**: 2 vCPU, 2GB RAM - $15
- **EBS Storage**: 20GB SSD - $2
- **Data Transfer**: 50GB/month - $4.50

### Recommended Setup (~$45/month)
- **EC2 t3.medium**: 2 vCPU, 4GB RAM - $30
- **EBS Storage**: 30GB SSD - $3
- **Data Transfer**: 100GB/month - $9
- **Elastic IP**: Static IP - $3.60

### Production Setup (~$61/month)
- **EC2 t3.medium**: $30
- **Application Load Balancer**: $16
- **EBS Storage**: 30GB SSD - $3
- **Data Transfer**: 100GB/month - $9
- **Elastic IP**: $3.60

---

## Prerequisites

1. AWS Account
2. Domain name (optional, for custom domain)
3. MongoDB Atlas connection string (already have)
4. Redis password (optional, for security)

---

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance via AWS Console

1. Log into AWS Console → EC2 → Launch Instance
2. **Name**: `arcpp-web-server`
3. **AMI**: Ubuntu Server 22.04 LTS
4. **Instance Type**:
   - Development: `t3.small` (2 vCPU, 2GB RAM)
   - Production: `t3.medium` (2 vCPU, 4GB RAM)
5. **Key Pair**: Create new or use existing (download .pem file)
6. **Network Settings**:
   - Create security group: `arcpp-web-sg`
   - Allow SSH (22) from your IP
   - Allow HTTP (80) from anywhere (0.0.0.0/0)
   - Allow HTTPS (443) from anywhere (0.0.0.0/0)
7. **Storage**: 30GB gp3 SSD
8. Click **Launch Instance**

### 1.2 Allocate Elastic IP (Optional but Recommended)

1. EC2 → Elastic IPs → Allocate Elastic IP
2. Select the IP → Actions → Associate Elastic IP
3. Choose your instance → Associate

---

## Step 2: Connect to EC2 Instance

```bash
# Set permissions on key file
chmod 400 your-key.pem

# SSH into instance (replace with your IP)
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

---

## Step 3: Install Docker on EC2

Run these commands on your EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Log out and back in for group changes
exit
```

SSH back in:
```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

---

## Step 4: Deploy Application

### 4.1 Transfer Code to EC2

On your **local machine**:

```bash
# Navigate to project directory
cd /Users/manojt/Documents/RIT/RA/RA_New/arcpp-web

# Create deployment package (exclude node_modules)
tar --exclude='node_modules' \
    --exclude='client/node_modules' \
    --exclude='server/node_modules' \
    --exclude='.git' \
    --exclude='client/build' \
    -czf arcpp-web.tar.gz .

# Transfer to EC2
scp -i your-key.pem arcpp-web.tar.gz ubuntu@<EC2-PUBLIC-IP>:~/
```

### 4.2 Extract and Setup on EC2

On **EC2 instance**:

```bash
# Create app directory
mkdir -p ~/arcpp-web
cd ~/arcpp-web

# Extract files
tar -xzf ~/arcpp-web.tar.gz

# Create .env file for server (if not already included)
nano server/.env
```

Add your environment variables:
```env
MONGO_URI=mongodb+srv://manojt01:your-password@arcpp.31dnrtt.mongodb.net/ArcPP
PORT=5000
NODE_ENV=production
REDIS_HOST=redis
REDIS_PORT=6379
```

Save and exit (Ctrl+X, Y, Enter)

### 4.3 Build and Start Containers

```bash
# Build and start all containers
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f redis
```

---

## Step 5: Populate Redis Cache

```bash
# Access the server container
docker exec -it arcpp-server sh

# Run the cache population script
node scripts/populateProteinSummaryCache.js

# Exit container
exit
```

---

## Step 6: Verify Deployment

1. **Test Backend API**:
   ```bash
   curl http://<EC2-PUBLIC-IP>:5000/api/health
   ```

2. **Test Frontend**:
   Open browser: `http://<EC2-PUBLIC-IP>`

3. **Test Redis**:
   ```bash
   docker exec -it arcpp-redis redis-cli
   > PING
   > KEYS protein:summary:*
   > exit
   ```

---

## Step 7: Configure Domain (Optional)

### Using Route 53 (AWS DNS)

1. Register domain or transfer existing domain to Route 53
2. Create Hosted Zone for your domain
3. Create A Record pointing to your Elastic IP:
   - Name: `arcpp.yourdomain.com`
   - Type: A
   - Value: Your Elastic IP

### Using External DNS Provider

1. Add an A record in your DNS provider:
   - Host: `@` or `arcpp`
   - Value: Your Elastic IP
   - TTL: 300

---

## Step 8: SSL/HTTPS Setup with Let's Encrypt

```bash
# Install Certbot
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Stop containers temporarily
cd ~/arcpp-web
docker-compose stop client

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update nginx.conf to use SSL (see SSL-NGINX-CONFIG.md)
# Restart containers
docker-compose up -d
```

---

## Management Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f redis
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart server
docker-compose restart client
```

### Update Application
```bash
# On local machine - create new package
tar --exclude='node_modules' \
    --exclude='client/node_modules' \
    --exclude='server/node_modules' \
    --exclude='.git' \
    --exclude='client/build' \
    -czf arcpp-web.tar.gz .

scp -i your-key.pem arcpp-web.tar.gz ubuntu@<EC2-PUBLIC-IP>:~/

# On EC2
cd ~/arcpp-web
docker-compose down
tar -xzf ~/arcpp-web.tar.gz
docker-compose up -d --build
```

### Backup Redis Data
```bash
# Create backup
docker exec arcpp-redis redis-cli BGSAVE

# Copy backup from container
docker cp arcpp-redis:/data/dump.rdb ~/redis-backup-$(date +%Y%m%d).rdb
```

### Monitor Resources
```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h

# Check Docker disk usage
docker system df
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs <service-name>

# Check if port is already in use
sudo netstat -tulpn | grep <port>

# Rebuild specific service
docker-compose up -d --build <service-name>
```

### Out of Memory
```bash
# Check memory usage
free -h
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Redis connection issues
```bash
# Check if Redis is running
docker exec arcpp-redis redis-cli PING

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

---

## Security Best Practices

1. **Use Security Groups**: Only allow necessary ports
2. **Enable UFW Firewall**:
   ```bash
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```
3. **Regular Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
4. **Redis Password**: Add password protection to Redis
5. **Environment Variables**: Never commit .env files to git
6. **SSL Certificate**: Use HTTPS in production
7. **Backup Data**: Regular backups of Redis and MongoDB

---

## Monitoring and Alerts

### CloudWatch Integration (Optional)

1. Install CloudWatch agent
2. Monitor CPU, Memory, Disk
3. Set up alarms for high usage
4. Track application logs

### Cost Monitoring

1. AWS Cost Explorer: Track spending
2. Set up billing alerts
3. Use AWS Budgets to set limits

---

## Scaling Options

### Vertical Scaling (Upgrade Instance)
1. Stop instance
2. Change instance type (e.g., t3.medium → t3.large)
3. Start instance

### Horizontal Scaling (Multiple Instances)
1. Set up Application Load Balancer
2. Launch multiple EC2 instances
3. Configure auto-scaling group
4. Use ElastiCache for shared Redis

---

## Cost Optimization Tips

1. **Use Reserved Instances**: Save up to 72% vs On-Demand
2. **Use Spot Instances**: For non-critical workloads (up to 90% savings)
3. **Right-size instances**: Start small, scale as needed
4. **S3 for static assets**: Offload static files to S3 + CloudFront
5. **Enable CloudWatch logs retention**: Limit log storage to 7-30 days
6. **Schedule instances**: Stop dev instances when not in use

---

## Support and Resources

- AWS Documentation: https://docs.aws.amazon.com/
- Docker Documentation: https://docs.docker.com/
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- Let's Encrypt: https://letsencrypt.org/docs/
