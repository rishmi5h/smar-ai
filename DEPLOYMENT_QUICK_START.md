# Deployment Quick Start Guide

Choose your deployment option and follow the guide.

## 🚀 Option 1: Docker (Recommended for Local/Self-Hosted)

**Best for:** Running on your own server, VPS, or locally

```bash
# Start all services with one command
./scripts/deploy-docker.sh start

# Access your app:
# - Frontend: http://localhost:3000
# - Backend:  http://localhost:5050
# - Ollama:   http://localhost:11434

# View logs
./scripts/deploy-docker.sh logs

# Stop services
./scripts/deploy-docker.sh stop
```

**Requirements:**
- Docker & Docker Compose installed
- 8GB+ RAM recommended

**Cost:** Free (self-hosted)

---

## 🌐 Option 2: Railway + Netlify (Recommended for Cloud)

**Best for:** Scalable cloud deployment

### Step 1: Deploy Backend to Railway (5 minutes)

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `server`
5. Add environment variables:
   ```
   PORT=5050
   OLLAMA_API_URL=http://your-ollama-url:11434/api
   OLLAMA_MODEL=deepseek-r1:latest
   ```
6. Deploy!

📖 **Full guide:** [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

### Step 2: Deploy Frontend to Netlify (5 minutes)

1. Go to https://netlify.app
2. Click "New site from Git" → Select your repository
3. Base directory: `client`
4. Build command: `npm run build`
5. Publish directory: `client/dist`
6. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-backend.railway.app/api
   ```
7. Deploy!

📖 **Full guide:** [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)

**Cost:** ~$5-15/month (Railway) + Free (Netlify)

---

## 💻 Option 3: Traditional VPS

**Best for:** Full control, custom configurations

Steps:
1. SSH into your server (AWS, DigitalOcean, Linode)
2. Install Node.js and Ollama
3. Clone repository and configure `.env`
4. Use PM2 to manage processes
5. Set up Nginx as reverse proxy
6. Enable HTTPS with Let's Encrypt

📖 **Full guide:** [DEPLOYMENT.md](./DEPLOYMENT.md#option-3-traditional-vpscloud)

**Cost:** $5-50/month depending on server size

---

## ⚡ Quick Comparison

| Feature | Docker | Railway+Netlify | VPS |
|---------|--------|-----------------|-----|
| Setup Time | 5 min | 10 min | 30 min |
| Cost | Free | $5-15/mo | $5-50/mo |
| Scalability | Good | Excellent | Good |
| Control | High | Medium | Very High |
| Maintenance | Medium | Low | High |
| Best For | Local/Dev | Production | Custom Needs |

---

## 🔧 Essential Configuration

### 1. Environment Variables

**Backend (.env):**
```
PORT=5050
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_MODEL=deepseek-r1:latest
GITHUB_TOKEN=your_github_token (optional)
```

### 2. Update CORS

Edit `server/src/index.js` to allow your frontend domain:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-netlify-domain.netlify.app'
];
```

### 3. Frontend API URL

Set `VITE_API_URL` environment variable pointing to your backend.

---

## 🧪 Testing Your Deployment

### Test Backend
```bash
curl https://your-backend-url/api/health
```

### Test Full Integration
```bash
curl -X POST https://your-backend-url/api/repo-info \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "vercel/next.js"}'
```

### Test Frontend
- Visit your frontend URL
- Search for a repository
- Check that analysis works

---

## 📝 Deployment Checklist

- [ ] Code committed and pushed to GitHub
- [ ] `.env` file configured with correct values
- [ ] Ollama is running and accessible
- [ ] Backend service deployed and tested
- [ ] Frontend environment variables set
- [ ] Frontend service deployed and tested
- [ ] CORS configured for your domain
- [ ] Custom domain set up (if using)
- [ ] SSL/HTTPS enabled
- [ ] Monitoring and logs configured

---

## 🆘 Common Issues

### "Cannot reach Ollama"
- Check `OLLAMA_API_URL` is correct
- Ensure Ollama is running
- For Railway, use ngrok: `ngrok http 11434`

### "CORS error"
- Update allowed origins in `server/src/index.js`
- Add your frontend domain
- Redeploy backend

### "Build fails"
- Check `client/package.json` dependencies
- Verify build command is `npm run build`
- Check logs for specific error

### "API calls failing"
- Check `VITE_API_URL` environment variable
- Test backend URL directly in browser
- Verify backend is running

---

## 📚 Full Documentation

| Guide | Purpose |
|-------|---------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Complete deployment guide with all options |
| [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) | Railway backend deployment details |
| [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) | Netlify frontend deployment details |
| [LOCAL_SETUP.md](./LOCAL_SETUP.md) | Local development setup |
| [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) | Ollama installation & configuration |

---

## 🚀 Next Steps

1. **Choose your deployment option** (Docker, Railway+Netlify, or VPS)
2. **Follow the corresponding guide** from above
3. **Test your deployment** using the testing commands
4. **Monitor and maintain** using the deployment platform's dashboard
5. **Update and scale** as needed

---

## 💬 Support

Need help? Check:
- Full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting
- Platform docs:
  - [Railway Docs](https://docs.railway.app)
  - [Netlify Docs](https://docs.netlify.com)
  - [Docker Docs](https://docs.docker.com)
  - [Ollama Docs](https://github.com/ollama/ollama)

---

**Ready to deploy?** Pick your option above and follow the guide! 🎉
