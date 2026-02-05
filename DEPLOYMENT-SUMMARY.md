# AWS Deployment Summary - Quick Reference

## 📊 Cost Estimates (Monthly)

### Option 1: Minimal Setup (Development/Testing)
**Total: ~$21.50/month**
- EC2 t3.small (2 vCPU, 2GB RAM): $15
- EBS Storage 20GB: $2
- Data Transfer 50GB: $4.50

**Good for:** Low traffic, development, testing

### Option 2: Recommended Setup (Small Production)
**Total: ~$45/month**
- EC2 t3.medium (2 vCPU, 4GB RAM): $30
- EBS Storage 30GB: $3
- Data Transfer 100GB: $9
- Elastic IP: $3.60

**Good for:** Academic projects, small user base (10-100 concurrent users)

### Option 3: Production with Load Balancer
**Total: ~$61/month**
- EC2 t3.medium: $30
- Application Load Balancer: $16
- EBS Storage 30GB: $3
- Data Transfer 100GB: $9
- Elastic IP: $3.60

**Good for:** Production apps, high availability needed

---

## 🚀 Quick Start Deployment (3 Simple Steps)

### Step 1: Create EC2 Instance (AWS Console)
```
1. Go to AWS Console → EC2 → Launch Instance
2. Name: arcpp-web-server
3. AMI: Ubuntu 22.04 LTS
4. Instance: t3.medium (or t3.small for dev)
5. Key Pair: Create new (download .pem file)
6. Security Group:
   - SSH (22) - Your IP only
   - HTTP (80) - Anywhere
   - HTTPS (443) - Anywhere
7. Storage: 30GB gp3
8. Launch!
```

### Step 2: Deploy Application
```bash
# On your LOCAL machine:
cd /Users/manojt/Documents/RIT/RA/RA_New/arcpp-web
./deploy.sh

# Follow the instructions to transfer files to EC2
# Then SSH into EC2 and run deploy.sh again
```

### Step 3: Populate Redis Cache
```bash
# SSH into EC2, then:
docker exec -it arcpp-server node scripts/populateProteinSummaryCache.js
```

**Done!** Visit `http://YOUR-EC2-IP` to see your app.

---

## 📦 What Gets Deployed

```
Your EC2 Instance
├── Docker Containers:
│   ├── Nginx (Frontend - React app on port 80)
│   ├── Node.js (Backend API on port 5000)
│   └── Redis (Cache on port 6379)
│
└── External Services:
    └── MongoDB Atlas (already set up)
```

---

## 💰 Cost Optimization Tips

1. **Start Small**: Begin with t3.small ($15/month), upgrade later if needed
2. **Reserved Instances**: Commit to 1-year for 40% savings ($18/month instead of $30)
3. **Spot Instances**: Use for dev/test (up to 70% savings)
4. **Monitor Usage**: Set up billing alerts in AWS
5. **Stop Dev Instances**: Stop instances when not in use (pay only for storage ~$3/month)

---

## 📈 When to Upgrade Instance Size

| Instance | vCPU | RAM | Use Case | Cost/month |
|----------|------|-----|----------|------------|
| t3.micro | 2 | 1GB | Testing only | $7.50 |
| t3.small | 2 | 2GB | Dev, light traffic | $15 |
| **t3.medium** | 2 | 4GB | **Recommended start** | $30 |
| t3.large | 2 | 8GB | 100+ concurrent users | $60 |
| t3.xlarge | 4 | 16GB | Heavy workloads | $120 |

**Recommendation**: Start with t3.medium, monitor CPU/memory usage for 1-2 weeks, then adjust.

---

## 🔧 Maintenance Commands

### View Application Status
```bash
docker-compose ps
docker stats
```

### View Logs
```bash
docker-compose logs -f
docker-compose logs -f server  # Just backend
docker-compose logs -f client  # Just frontend
```

### Restart Services
```bash
docker-compose restart
docker-compose restart server  # Just backend
```

### Update Application
```bash
# On local machine:
./deploy.sh

# Transfer to EC2, then on EC2:
cd ~/arcpp-web
docker-compose down
tar -xzf ~/arcpp-web.tar.gz
docker-compose up -d --build
```

---

## 🔒 Security Checklist

- [ ] Change default SSH port (optional)
- [ ] Enable UFW firewall
- [ ] Add password to Redis
- [ ] Use strong MongoDB password
- [ ] Set up SSL/HTTPS (Let's Encrypt)
- [ ] Regular system updates
- [ ] Backup Redis data weekly
- [ ] Set up CloudWatch monitoring
- [ ] Enable AWS billing alerts

---

## 📊 Performance Expectations

### t3.small (2GB RAM)
- Concurrent Users: 10-30
- Response Time: <100ms for cached data
- Redis Cache: ~500MB (2,368 proteins)
- Node.js Memory: ~200-300MB

### t3.medium (4GB RAM) ⭐ Recommended
- Concurrent Users: 30-100
- Response Time: <50ms for cached data
- Redis Cache: ~500MB
- Node.js Memory: ~200-400MB
- Plenty of headroom

### t3.large (8GB RAM)
- Concurrent Users: 100-300
- Response Time: <50ms
- Can handle multiple simultaneous coverage calculations

---

## 🆘 Quick Troubleshooting

### Application won't start
```bash
docker-compose logs
# Check logs for errors
```

### Out of memory
```bash
free -h
# If low, upgrade instance size
```

### Can't connect to website
```bash
# Check security group allows HTTP (80)
# Check instance is running
# Check docker containers: docker-compose ps
```

### Redis empty after restart
```bash
# Repopulate cache
docker exec -it arcpp-server node scripts/populateProteinSummaryCache.js
```

---

## 📞 Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Docker Docs**: https://docs.docker.com/
- **Full Deployment Guide**: See AWS-DEPLOYMENT-GUIDE.md

---

## 🎓 AWS Free Tier (First Year Only)

If you're on AWS Free Tier (first 12 months):
- 750 hours/month t2.micro or t3.micro EC2 (enough for 1 instance running 24/7)
- 30GB EBS storage
- 1GB data transfer out/month
- **Estimated cost first year**: ~$5-10/month (just data transfer overages)

After free tier ends: ~$21-45/month depending on instance size.

---

## 🔮 Alternative: Cheaper Options

### 1. DigitalOcean Droplet
- $12/month for 2GB RAM droplet
- Simpler interface than AWS
- Predictable pricing

### 2. Heroku
- Free tier available (limited)
- ~$7/month for hobby tier
- Much easier deployment (but less control)

### 3. Vercel (Frontend) + Railway (Backend)
- Free tier available
- Modern deployment
- ~$5-20/month for production

**For academic/research projects, AWS is still recommended for:**
- Learning cloud infrastructure
- Scalability
- AWS credits available for students/researchers
