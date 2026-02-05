# Netlify Deployment Guide

Complete step-by-step guide to deploy smar-ai frontend on Netlify.

## Prerequisites

- GitHub account with the smar-ai repository
- Netlify account (free tier available)
- Backend deployed (Railway or other platform)

## Step 1: Create Netlify Account

1. Go to https://netlify.app
2. Sign up with GitHub (recommended)
3. Authorize Netlify to access your GitHub account

## Step 2: Connect GitHub Repository

### Method 1: Direct from Netlify Dashboard (Recommended)

1. Log in to https://app.netlify.com
2. Click **"New site from Git"**
3. Click **"Connect to Git provider"** → **"GitHub"**
4. Find and select your `smar-ai` repository
5. Click **"Connect"**

### Method 2: Through GitHub

1. Go to your GitHub repository
2. Settings → Integrations & services
3. Add Netlify

## Step 3: Configure Build Settings

Netlify will show a configuration page. Set these values:

### Build Configuration

| Field | Value |
|-------|-------|
| **Base directory** | `client` |
| **Build command** | `npm run build` |
| **Publish directory** | `client/dist` |

These settings tell Netlify:
- Where your frontend code is (`client` folder)
- How to build it (`npm run build`)
- Where to publish from (`dist` folder after build)

## Step 4: Set Environment Variables

Before deploying, you need to set the backend API URL:

1. In Netlify, click **"Deploy settings"** → **"Environment"**
2. Click **"Edit variables"**
3. Add this environment variable:

```
VITE_API_URL = https://your-railway-backend.railway.app/api
```

Replace `https://your-railway-backend.railway.app/api` with your actual Railway backend URL.

### How to find your Railway URL:
1. Go to Railway dashboard
2. Select your backend service
3. Click "Deployments"
4. Look for the public URL

## Step 5: Deploy

Once environment variables are set:

1. Click **"Deploy site"**
2. Netlify will:
   - Pull your code from GitHub
   - Build the React app
   - Deploy to Netlify's CDN
3. You'll see a build log in real-time

Wait for the build to complete (usually 1-2 minutes).

## Step 6: Get Your Frontend URL

Once deployed:

1. You'll see a green checkmark and a URL like:
   ```
   https://your-site-name.netlify.app
   ```
2. Click the URL to visit your deployed site
3. Or find it in "Site settings" → "General" → "Site address"

## Step 7: Configure Custom Domain (Optional)

If you have a custom domain:

1. Go to Site settings → **"Domain management"**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `smar-ai.com`)
4. Follow DNS configuration instructions
5. Netlify provides SSL certificate automatically

## Step 8: Update Backend CORS

Your backend needs to allow requests from your Netlify domain:

1. Edit `server/src/index.js`
2. Find the CORS configuration
3. Add your Netlify domain:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-site-name.netlify.app'
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

4. Commit and push:
```bash
git add server/src/index.js
git commit -m "Update: add Netlify domain to CORS"
git push origin main
```

5. Your Railway backend will automatically redeploy

## Step 9: Test the Frontend

1. Visit your Netlify URL
2. Try searching for a GitHub repository
3. Check that:
   - Frontend loads correctly
   - API calls work (check browser console)
   - Analysis displays properly

## Troubleshooting

### Build Fails

**Check build logs:**
1. In Netlify, go to "Deployments"
2. Click the failed deployment
3. Scroll down to see error messages

**Common issues:**
- Missing dependencies: Run `npm install` locally to verify
- Build command error: Check `client/package.json` scripts
- Base directory wrong: Ensure it's set to `client`

### API Calls Failing

**Check browser console (F12):**

Look for errors like:
- "Failed to fetch from http://localhost:5050" - The VITE_API_URL is wrong
- CORS error - Backend needs to be updated
- "Cannot reach API" - Backend is down or unreachable

**Solutions:**
1. Verify VITE_API_URL in Netlify environment variables
2. Test the backend URL directly in browser:
   ```
   https://your-railway-backend.railway.app/api/health
   ```
3. Check backend CORS allows your Netlify domain

### Blank Page or 404

- Clear Netlify cache: Deployments → Trigger deploy → Clear cache & redeploy
- Check build output in deployment logs
- Verify `dist` folder was created during build

## Auto-Deploy from Git

Netlify automatically deploys when you push to main:

### Avoid Rebuilding When Backend Changes
If you deploy the backend separately (Railway) and want Netlify to rebuild only when the UI changes, add a build ignore rule in `netlify.toml`:

```toml
[build.ignore]
  command = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- client"
```

This tells Netlify to skip builds unless files under `client/` changed.

```bash
# Make a change to frontend
echo "// Updated" >> client/src/App.jsx

# Commit and push
git add client/src/App.jsx
git commit -m "Update: frontend improvements"
git push origin main

# Netlify will automatically rebuild and deploy
# Monitor in Netlify dashboard
```

## Environment Variables Reference

| Variable | Value | Example |
|----------|-------|---------|
| VITE_API_URL | Backend API URL | https://smar-ai-backend.railway.app/api |

### How Vite uses environment variables:

The frontend uses Vite, which requires environment variables to start with `VITE_`:

```javascript
// In your React code:
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
```

## Monitoring

### View Logs

1. Go to **"Logs"** in Netlify dashboard
2. See build logs and function logs

### Monitor Performance

1. In Netlify, go to **"Analytics"**
2. View page performance metrics
3. Check for errors in **"Errors"** tab

## Optimizations

### Enable Asset Optimization

1. Site settings → **"Build & deploy"**
2. Enable:
   - [x] Asset optimization
   - [x] Pretty URLs
   - [x] Strict builds

### Configure Cache

Netlify automatically caches your built assets. To optimize further:

```toml
# In netlify.toml (already configured)
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, immutable, max-age=31536000"
```

## Cost Considerations

**Netlify Pricing:**
- **Free tier:** $0/month
  - 300 build minutes/month
  - Unlimited deployments from Git
  - Perfect for most projects

- **Pro:** $19/month
  - 3000 build minutes/month
  - Advanced functions

## Rollback to Previous Deployment

If something breaks:

1. Go to **"Deployments"**
2. Find the working deployment
3. Click **"Publish deploy"**
4. Your site will revert to that version instantly

## Custom Git Branch Deployment

Deploy from different branches:

1. Site settings → **"Build & deploy"** → **"Deploy contexts"**
2. Configure:
   - **Production branch:** main
   - **Deploy preview:** All pull requests
   - **Branch deploy:** Optional branches

## Next Steps

1. ✅ Deploy frontend to Netlify
2. ✅ Test API integration
3. ✅ Configure custom domain (optional)
4. ✅ Monitor performance
5. 📋 Set up alerts (optional)
6. 📋 Configure analytics (optional)

## Support

- Netlify Docs: https://docs.netlify.com
- Netlify Support: support@netlify.com
- Community: https://community.netlify.com

---

**Need help?** Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) for other deployment options.
