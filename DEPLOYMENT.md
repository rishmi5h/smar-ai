# Deployment Guide for smar-ai

This guide covers deploying **smar-ai** to production environments. You have several deployment options depending on where you want to host the backend and frontend.

**Live app:** https://smarai.rishmi5h.com

## Table of Contents
1. [Deployment Architecture](#deployment-architecture)
2. [Option 1: Railway + Netlify (Recommended)](#option-1-railway--netlify-recommended)
3. [Option 2: Docker Deployment](#option-2-docker-deployment)
4. [Option 3: Traditional VPS/Cloud](#option-3-traditional-vpscloud)
5. [Environment Configuration](#environment-configuration)
6. [Post-Deployment](#post-deployment)

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Netlify)                      │
│                    React + Vite (Static Site)                   │
│                    http://smar-ai.netlify.app                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    API Requests to Backend
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Backend (Railway)                            │
│              Express.js + Ollama Integration                    │
│              https://smar-ai-backend.railway.app                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Ollama API Requests
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  Ollama Service (Self-hosted)                   │
│              Running on your local machine/server               │
│              http://localhost:11434 or external IP              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Option 1: Railway + Netlify (Recommended)

### Part A: Deploy Backend to Railway

**Step 1: Prepare Repository**

1. Ensure your code is pushed to GitHub:
```bash
cd /Users/rishabh/Documents/claude-code/smar-ai
git add .
git commit -m "Fix: Handle non-string content in code snippets"
git push origin main
```

2. Check your `.gitignore` to ensure sensitive files are excluded:
```bash
cat .gitignore
```

Your `.gitignore` should include:
```
node_modules/
.env
.env.local
.DS_Store
dist/
```

**Step 2: Create Railway Account**

1. Go to https://railway.app
2. Sign up (can use GitHub for quick signup)
3. Create a new project

**Step 3: Connect GitHub Repository**

1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your `smar-ai` repository
4. Railway will auto-detect the Node.js backend

**Step 4: Configure Environment Variables**

In Railway dashboard, go to Variables and add:

```
PORT=5050
OLLAMA_API_URL=http://your-ollama-server:11434/api
OLLAMA_MODEL=deepseek-r1:latest
GITHUB_TOKEN=your_github_token_here (optional)
```

**Important**: The `OLLAMA_API_URL` must be accessible from Railway's servers. If Ollama is on your local machine, you'll need to:
- Use ngrok to expose your local Ollama: `ngrok http 11434`
- Use a cloud-hosted Ollama instance
- Or expose Ollama on a public IP with proper security

**Step 5: Configure Build & Start Commands**

In Railway's Settings:
- **Root Directory**: `server`
- **Install Command**: `npm install`
- **Build Command**: (leave empty or remove if not needed)
- **Start Command**: `npm start`

**Step 6: Deploy**

1. Click "Deploy" - Railway will automatically build and deploy
2. Get your backend URL from Railway dashboard (e.g., `https://smar-ai-backend-prod.railway.app`)
3. Note this URL for frontend configuration

### Part B: Deploy Frontend to Netlify

**Step 1: Prepare Build**

The frontend needs to be built before deployment. Create a build script in the root:

```bash
cd client
npm run build
```

**Step 2: Create Netlify Account**

1. Go to https://netlify.app
2. Sign up (can use GitHub)

**Step 3: Connect GitHub Repository**

1. In Netlify, click "Add new site" → "Import an existing project"
2. Connect your GitHub account
3. Select `smar-ai` repository

**Step 4: Configure Build Settings**

In Netlify deployment settings:
- **Base directory**: `client`
- **Build command**: `npm run build`
- **Publish directory**: `client/dist`

**Step 5: Set Environment Variables**

In Netlify Site settings → Build & deploy → Environment:

```
VITE_API_URL=https://your-railway-backend-url/api
```

Replace with actual Railway backend URL from Step A.

**Step 6: Deploy**

1. Netlify will automatically build and deploy on push
2. Your site will be available at `https://your-site.netlify.app`

**Step 7: Update CORS in Backend**

In `server/src/index.js`, update the CORS configuration to allow your Netlify domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-site.netlify.app'
  ]
}));
```

Then push this change to trigger a Railway redeploy.

---

## Option 2: Docker Deployment

### Create Docker Configuration

**Create `server/Dockerfile`:**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 5050

CMD ["npm", "start"]
```

**Create `docker-compose.yml` at root:**

```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "5050:5050"
    environment:
      PORT: 5050
      OLLAMA_API_URL: ${OLLAMA_API_URL}
      OLLAMA_MODEL: ${OLLAMA_MODEL}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
    depends_on:
      - ollama

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      OLLAMA_HOST: 0.0.0.0:11434

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://backend:5050/api
    depends_on:
      - backend

volumes:
  ollama_data:
```

**Create `client/Dockerfile`:**

```dockerfile
FROM node:22-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

**Create `client/nginx.conf`:**

```nginx
server {
    listen 3000;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://backend:5050/api;
    }
}
```

### Deploy Docker

**Option A: Local Docker**
```bash
docker-compose up -d
```

**Option B: Docker Hub**
```bash
# Build and push to Docker Hub
docker build -t yourusername/smar-ai-server:latest ./server
docker push yourusername/smar-ai-server:latest

# Pull and run on your server
docker pull yourusername/smar-ai-server:latest
docker run -d -p 5050:5050 \
  -e OLLAMA_API_URL=http://ollama:11434/api \
  -e OLLAMA_MODEL=deepseek-r1:latest \
  yourusername/smar-ai-server:latest
```

---

## Option 3: Traditional VPS/Cloud

### Deploy to AWS EC2 / DigitalOcean / Linode

**Step 1: SSH into Your Server**

```bash
ssh ubuntu@your-server-ip
```

**Step 2: Install Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install PM2 for process management
sudo npm install -g pm2
```

**Step 3: Clone Repository**

```bash
cd /home/ubuntu
git clone https://github.com/yourusername/smar-ai.git
cd smar-ai
```

**Step 4: Install Ollama (Optional - if running on same server)**

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve &

# Pull your model
ollama pull deepseek-r1:latest
```

**Step 5: Setup Backend**

```bash
cd server
npm install

# Create .env file
cat > .env << EOF
PORT=5050
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_MODEL=deepseek-r1:latest
GITHUB_TOKEN=your_github_token
EOF

# Start with PM2
pm2 start src/index.js --name "smar-ai-backend"
pm2 save
pm2 startup
```

**Step 6: Setup Frontend**

```bash
cd ../client
npm install
npm run build

# Serve with a web server (nginx recommended)
```

**Step 7: Install and Configure Nginx**

```bash
sudo apt install -y nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/smar-ai > /dev/null << EOF
upstream backend {
    server localhost:5050;
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /home/ubuntu/smar-ai/client/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/smar-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 8: Enable SSL/HTTPS (Let's Encrypt)**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Configuration

### Railway Environment Variables

```env
# Ollama Configuration
OLLAMA_API_URL=http://ollama-server-ip:11434/api
OLLAMA_MODEL=deepseek-r1:latest
PORT=5050

# Optional: GitHub Token for higher rate limits
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### Netlify Environment Variables

```env
VITE_API_URL=https://your-railway-backend.railway.app/api
```

### CORS Configuration

Update `server/src/index.js` to include your production domains:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-site.netlify.app',
  'https://your-domain.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  }
}));
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Test backend API
curl https://your-railway-backend.railway.app/api/health

# Test with a real request
curl -X POST https://your-railway-backend.railway.app/api/repo-info \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "vercel/next.js"}'
```

### 2. Monitor & Logs

**Railway Logs:**
- Go to Railway dashboard → Logs tab
- Monitor for errors

**Netlify Logs:**
- Go to Netlify → Deploys
- Check build logs for issues

### 3. Performance Optimization

1. **Enable Caching**
   - Set appropriate cache headers in Nginx/Railway
   - Cache static assets in Netlify CDN

2. **Optimize Ollama**
   - Use smaller models if response time is critical
   - Implement request queuing for high traffic

3. **Monitor Costs**
   - Railway: Check usage dashboard
   - Netlify: Free tier should work for most cases
   - Ollama: Self-hosted, only costs compute

### 4. Update Process

When making code changes:

1. **Backend Changes**
   ```bash
   git add server/
   git commit -m "Update: backend improvements"
   git push
   # Railway auto-deploys
   ```

2. **Frontend Changes**
   ```bash
   git add client/
   git commit -m "Update: UI improvements"
   git push
   # Netlify auto-deploys
   ```

### 5. Ollama Management

**If Ollama is self-hosted:**

```bash
# Pull new models
ollama pull llama2:latest

# List installed models
ollama list

# Stop Ollama
pkill ollama

# Check model status
ollama list
```

---

## Troubleshooting

### Backend Connection Issues
- **Error**: "Cannot reach Ollama API"
  - Check OLLAMA_API_URL is correct
  - Ensure Ollama is running
  - If remote, check firewall rules

- **Error**: "CORS error"
  - Add your frontend URL to allowedOrigins in `server/src/index.js`
  - Redeploy backend

### Frontend Not Loading
- **Error**: "API_URL undefined"
  - Check VITE_API_URL environment variable in Netlify
  - Clear cache and rebuild

### Slow Performance
- **Cause**: Ollama model generation takes time
  - Switch to smaller model (mistral, neural-chat)
  - Increase timeout if needed

---

## Quick Reference

| Component | Platform | URL | Status |
|-----------|----------|-----|--------|
| Frontend | Netlify | https://your-site.netlify.app | ✅ |
| Backend | Railway | https://your-backend.railway.app | ✅ |
| Ollama | Self-hosted | your-server:11434 | ⚠️ |

---

## Support

For issues with specific platforms:
- **Railway**: https://docs.railway.app
- **Netlify**: https://docs.netlify.com
- **Docker**: https://docs.docker.com
- **Ollama**: https://github.com/ollama/ollama
