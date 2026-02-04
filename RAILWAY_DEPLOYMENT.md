# Railway Deployment Guide

Complete step-by-step guide to deploy smar-ai backend on Railway.

## Prerequisites

- GitHub account with the smar-ai repository
- Railway account (free tier available)
- Access to your Ollama instance or a way to expose it

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended - easier authorization)
3. Verify your email

## Step 2: Prepare Your GitHub Repository

Ensure your code is properly committed and pushed:

```bash
cd /Users/rishabh/Documents/claude-code/smar-ai

# Check git status
git status

# Add all changes
git add .

# Commit with a meaningful message
git commit -m "Add: Docker and deployment configuration"

# Push to GitHub
git push origin main
```

## Step 3: Connect Repository to Railway

### Option A: Create New Project from Scratch

1. Log in to Railway: https://railway.app
2. Click on your profile → Dashboard
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Authorize Railway to access your GitHub account
6. Select the `smar-ai` repository
7. Railway will automatically detect the Node.js application

### Option B: Create Using Dashboard

1. Dashboard → New Project → "Empty Project"
2. Add a service → "GitHub repo"
3. Select your repository

## Step 4: Configure the Backend Service

Once the repo is connected, Railway will auto-detect the Node.js application. You need to configure it:

### In Railway Dashboard:

1. **Select the Service**
   - Click on the service that was created
   - You should see "smar-ai" or similar name

2. **Configure Root Directory**
   - Go to the service settings
   - Set **Root Directory** to `server`
   - This tells Railway to run from the backend folder

3. **Set Environment Variables**
   - Click on "Variables" tab
   - Add the following variables:

```
PORT=5050
OLLAMA_API_URL=http://your-ollama-url:11434/api
OLLAMA_MODEL=deepseek-r1:latest
GITHUB_TOKEN=your_github_token_here (optional)
NODE_ENV=production
```

### About OLLAMA_API_URL:

**Important**: Railway servers cannot access `localhost:11434` directly.

You have three options:

**Option 1: Use Ngrok (Easiest for testing)**
```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel to Ollama
ngrok http 11434

# Use the ngrok URL in OLLAMA_API_URL
# Example: OLLAMA_API_URL=https://xxxx-xx-xxx-xxxx.ngrok.io/api
```

**Option 2: Cloud-hosted Ollama**
- Use a service like Replicate, Together AI, or Hugging Face
- Use their API URL instead

**Option 3: Run Ollama on a Public Server**
- Deploy Ollama on a VPS (AWS, DigitalOcean, etc.)
- Expose it with proper security (firewall, auth)
- Use the public IP/domain

## Step 5: Deploy

Once configuration is complete:

1. Railway will automatically start building
2. You'll see build logs in real-time
3. Once build succeeds, the service is deployed

To manually trigger a redeploy:
- Push a new commit to main
- Or click "Redeploy" in the Railway dashboard

## Step 6: Get Your Backend URL

Once deployed:

1. Go to the service in Railway
2. Click on "Deployments" tab
3. Look for the URL (e.g., `https://smar-ai-backend-prod.railway.app`)
4. Save this URL - you'll need it for the frontend

## Step 7: Test the Backend

Test your deployment:

```bash
# Test basic connectivity
curl https://your-railway-url/api/health

# Test with a real request
curl -X POST https://your-railway-url/api/repo-info \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "vercel/next.js"}'
```

## Step 8: Deploy Frontend to Netlify

See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for frontend setup.

But remember to use your Railway backend URL when configuring the frontend.

## Environment Variables Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| PORT | No | 5050 | Railway assigns port automatically |
| OLLAMA_API_URL | Yes | http://ollama:11434/api | Must be accessible from Railway |
| OLLAMA_MODEL | Yes | deepseek-r1:latest | Must be installed in Ollama |
| GITHUB_TOKEN | No | ghp_xxx... | For higher GitHub API rate limits |
| NODE_ENV | No | production | Default is development |

## Monitoring & Logs

### View Logs

1. In Railway dashboard, go to your service
2. Click on "Logs" tab
3. See real-time application logs

### Common Issues and Solutions

**Issue: "Cannot reach Ollama API"**
- Check OLLAMA_API_URL is correct
- Ensure Ollama is running on the specified URL
- Test the URL independently: `curl https://your-ollama-url/api/tags`

**Issue: Build fails with "Cannot find module"**
- Ensure root directory is set to `server`
- Check package.json dependencies are all listed
- Try manually running: `npm install` in the server directory

**Issue: Deploy succeeds but service won't start**
- Check the Logs tab for error messages
- Verify environment variables are set
- Check that PORT is set (Railway provides PORT env var)

**Issue: CORS errors in browser**
- Update CORS in `server/src/index.js` to include your Netlify domain
- Redeploy after making changes

## Auto-Deploy from Git

Railway automatically deploys when you push to main branch:

```bash
# Make a change
echo "// Updated" >> server/src/index.js

# Commit and push
git add server/src/index.js
git commit -m "Update: code changes"
git push origin main

# Railway will automatically redeploy
# Monitor in Railway dashboard
```

## Custom Domain (Optional)

To use a custom domain with Railway:

1. Go to your service settings
2. Click "Domain" or "Environment"
3. Add your domain
4. Update DNS records as instructed by Railway

## Troubleshooting Commands

```bash
# Check if Ollama is accessible
curl -I https://your-ollama-url/api/tags

# Test backend endpoint
curl -v https://your-railway-url/api/health

# Check environment variables in Railway logs
# Should see them printed on startup
```

## Cost Considerations

**Railway Pricing:**
- Free tier: $5/month credit
- After that: Pay-as-you-go pricing
- Typical monthly cost: $5-15 depending on usage

**Money-saving tips:**
1. Use smaller Ollama models (mistral vs deepseek-r1)
2. Implement request caching
3. Optimize code snippets size
4. Monitor usage in Railway dashboard

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Test API endpoints
3. 📋 Deploy frontend to Netlify
4. 📋 Update CORS configuration
5. 📋 Set up custom domain (optional)
6. 📋 Monitor performance and costs

## Support

- Railway Docs: https://docs.railway.app
- Railway Support: support@railway.app
- Community: https://github.com/railwayapp/railway

---

**Need help?** Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) for other deployment options.
