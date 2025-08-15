# 🚀 24/7 Bot Hosting Setup Guide

## Quick Start Options

### 🏠 Option 1: Local Machine + PM2 (Immediate Setup)
**Best for:** Testing, development, personal use
**Cost:** Free
**Setup Time:** 5 minutes

### 🌐 Option 2: VPS Hosting (Recommended)
**Best for:** Production use, reliability
**Cost:** $5-20/month
**Setup Time:** 15-30 minutes

### ☁️ Option 3: Cloud Platforms (Enterprise)
**Best for:** High availability, scaling
**Cost:** $10-50/month
**Setup Time:** 30-60 minutes

---

## 🏠 Method 1: Local Machine with PM2

### Step 1: Install PM2
```bash
npm install -g pm2
```

### Step 2: Create PM2 Configuration
```bash
# In your bot directory
pm2 start index.js --name "dragonball-bot"
```

### Step 3: Save PM2 Process List
```bash
pm2 save
pm2 startup
```

### Step 4: Monitor Your Bot
```bash
pm2 status              # Check status
pm2 logs dragonball-bot  # View logs
pm2 restart dragonball-bot  # Restart bot
pm2 stop dragonball-bot  # Stop bot
```

### Pros:
✅ Free and immediate
✅ Full control over environment
✅ Easy debugging and monitoring

### Cons:
❌ Requires your computer to stay on 24/7
❌ Vulnerable to power outages/restarts
❌ Limited by home internet connection

---

## 🌐 Method 2: VPS Hosting (Recommended)

### Popular VPS Providers:
- **DigitalOcean** ($6/month) - Beginner friendly
- **Linode** ($5/month) - Great performance
- **Vultr** ($6/month) - Fast deployment
- **AWS Lightsail** ($5/month) - Amazon ecosystem

### VPS Setup Process:

#### Step 1: Create VPS Instance
- **OS:** Ubuntu 22.04 LTS
- **RAM:** 1GB minimum (2GB recommended)
- **Storage:** 25GB minimum
- **Location:** Close to your users

#### Step 2: Connect to VPS
```bash
ssh root@your-vps-ip
```

#### Step 3: Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Git
apt install git -y
```

#### Step 4: Deploy Your Bot
```bash
# Clone your repository
git clone https://github.com/AMXgaming111/dragon-ball-finality.git
cd dragon-ball-finality

# Install dependencies
npm install

# Create .env file
nano .env
# Add your environment variables
```

#### Step 5: Start with PM2
```bash
pm2 start index.js --name "dragonball-bot"
pm2 save
pm2 startup
```

---

## ☁️ Method 3: Cloud Platforms

### Railway (Easiest Cloud Option)
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically
4. **Cost:** $5/month

### Heroku (Popular Choice)
1. Create Heroku app
2. Connect GitHub repository
3. Configure environment variables
4. Enable automatic deploys
5. **Cost:** $7/month (Eco dyno)

### Google Cloud Run (Serverless)
1. Build container image
2. Deploy to Cloud Run
3. Configure environment variables
4. **Cost:** Pay-per-use (usually $5-15/month)

---

## 🛠️ Pre-Deployment Checklist

### ✅ Environment Configuration
- [ ] `.env` file configured with all required variables
- [ ] Database path set correctly
- [ ] Discord token and client ID added
- [ ] Staff role name configured
- [ ] Owner user ID set (for security notifications)

### ✅ Security Setup
- [ ] Server whitelist configured (`!serverauth add <server_id>`)
- [ ] Bot permissions tested
- [ ] Unauthorized server protection tested

### ✅ Bot Testing
- [ ] All commands working locally
- [ ] Database connectivity verified
- [ ] Error handling tested
- [ ] Memory usage checked

### ✅ Monitoring Setup
- [ ] PM2 or equivalent process manager
- [ ] Log monitoring configured
- [ ] Restart policies in place
- [ ] Health check endpoints (optional)

---

## 📊 Comparison Matrix

| Feature | Local + PM2 | VPS | Cloud Platform |
|---------|-------------|-----|----------------|
| **Cost** | Free | $5-20/month | $5-50/month |
| **Reliability** | Medium | High | Very High |
| **Setup Difficulty** | Easy | Medium | Easy-Hard |
| **Scalability** | Low | Medium | High |
| **Maintenance** | High | Medium | Low |
| **Control** | Full | Full | Limited |
| **24/7 Guarantee** | No | Yes | Yes |

---

## 🎯 Recommended Path

### For Immediate Testing:
1. **Start with PM2 locally** (5 minutes setup)
2. Test all features thoroughly
3. Monitor resource usage

### For Production:
1. **Choose a VPS provider** (DigitalOcean recommended)
2. **Deploy with PM2 on VPS**
3. **Set up monitoring and backups**

### For Enterprise:
1. **Use Railway or Google Cloud Run**
2. **Implement CI/CD pipeline**
3. **Add advanced monitoring**

---

## 🚨 Important Notes

### Security Considerations:
- Always use environment variables for secrets
- Keep your VPS updated
- Use SSH keys instead of passwords
- Enable firewall (UFW on Ubuntu)
- Regular security audits

### Monitoring & Maintenance:
- Set up log rotation
- Monitor resource usage
- Keep dependencies updated
- Regular database backups
- Test disaster recovery

### Performance Optimization:
- Use PM2 cluster mode for high traffic
- Implement database connection pooling
- Add Redis for session management (if needed)
- Use CDN for static assets (if any)

---

## 📞 Next Steps

Choose your preferred method and I'll help you set it up step by step!

1. **Quick Local Test:** PM2 setup (recommended to start)
2. **Production VPS:** Full cloud deployment
3. **Managed Platform:** Railway/Heroku setup

Which option would you like to pursue first?
