# Deployment Checklist

Use this checklist to ensure everything is configured correctly before deploying.

## Pre-Deployment Checklist

### Code Quality
- [ ] Code is committed to git
- [ ] `.gitignore` includes `.env` and `node_modules`
- [ ] No hardcoded secrets in code
- [ ] No large files (> 100MB)
- [ ] All dependencies listed in `package.json`

### Environment Configuration
- [ ] `.env.example` files exist for reference
- [ ] Environment variables documented
- [ ] Default values are sensible
- [ ] No required secrets in `.env.example`

### Testing
- [ ] Local testing completed successfully
- [ ] API endpoints respond correctly
- [ ] Frontend loads without errors
- [ ] Analysis feature works end-to-end
- [ ] No console errors in browser
- [ ] No errors in backend logs

---

## Choose Your Deployment Option

### Option 1: Docker Deployment

#### Pre-Deployment
- [ ] Docker installed locally (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] 8GB+ RAM available
- [ ] Sufficient disk space (10GB+)

#### Configuration
- [ ] Review `docker-compose.yml`
- [ ] Check port availability (3000, 5050, 11434)
- [ ] Ollama model downloaded locally (if using Docker Ollama)
- [ ] `.env` file created from `.env.example`

#### Deployment
- [ ] Run: `./scripts/deploy-docker.sh start`
- [ ] Wait for services to start (2-3 minutes)
- [ ] Check logs: `./scripts/deploy-docker.sh logs`
- [ ] Test frontend: Open `http://localhost:3000`
- [ ] Test backend: `curl http://localhost:5050/api/health`

#### Post-Deployment
- [ ] All services running (`./scripts/deploy-docker.sh status`)
- [ ] No errors in logs
- [ ] API responding to requests
- [ ] Frontend displaying correctly
- [ ] Analysis feature working

---

### Option 2A: Railway Backend Deployment

#### Pre-Deployment
- [ ] GitHub account with repository access
- [ ] Railway account created (https://railway.app)
- [ ] Repository pushed to GitHub
- [ ] `.gitignore` properly configured

#### Configuration
- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Root directory set to `server`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`

#### Environment Variables
- [ ] `PORT` = 5050
- [ ] `OLLAMA_API_URL` = correct Ollama URL
- [ ] `OLLAMA_MODEL` = deepseek-r1:latest
- [ ] `GITHUB_TOKEN` = (optional, but recommended)

#### Ollama Configuration
- [ ] Ollama is accessible from Railway servers
  - [ ] Either: ngrok tunnel is running (`ngrok http 11434`)
  - [ ] Or: Ollama on cloud instance (Replicate, Together AI, etc.)
  - [ ] Or: VPS with public IP and proper firewall

#### Deployment
- [ ] Click "Deploy" in Railway
- [ ] Watch build logs for errors
- [ ] Build completes successfully
- [ ] Service starts without errors

#### Post-Deployment
- [ ] Get Railway backend URL
- [ ] Test: `curl https://your-railway-url/api/health`
- [ ] Test: Send sample API request
- [ ] Save URL for frontend configuration

---

### Option 2B: Netlify Frontend Deployment

#### Pre-Deployment
- [ ] Netlify account created (https://netlify.app)
- [ ] GitHub repository connected
- [ ] Railway backend URL obtained and verified

#### Configuration
- [ ] Base directory: `client`
- [ ] Build command: `npm run build`
- [ ] Publish directory: `client/dist`
- [ ] Node version: 22

#### Environment Variables
- [ ] `VITE_API_URL` = your Railway backend URL (e.g., `https://smar-ai-backend.railway.app/api`)

#### Deployment
- [ ] Click "Deploy site" in Netlify
- [ ] Watch build logs
- [ ] Build completes successfully

#### Post-Deployment
- [ ] Get Netlify frontend URL
- [ ] Open frontend URL in browser
- [ ] Check for console errors (F12)
- [ ] Test API integration
- [ ] Analysis feature works

#### Backend Configuration Update
- [ ] Edit `server/src/index.js`
- [ ] Add Netlify domain to `allowedOrigins`
- [ ] Commit and push changes
- [ ] Railway automatically redeploys
- [ ] Verify no CORS errors

---

### Option 3: VPS Deployment

#### Pre-Deployment
- [ ] VPS purchased and accessible via SSH
- [ ] Domain name (optional but recommended)
- [ ] SSH key pair configured
- [ ] Security group/firewall rules configured

#### Server Setup
- [ ] SSH access working
- [ ] Ubuntu 20.04+ installed
- [ ] System updated: `sudo apt update && apt upgrade`
- [ ] Node.js 22 installed
- [ ] Git installed
- [ ] Ollama installed (if running on same server)

#### Repository Setup
- [ ] Repository cloned to `/home/ubuntu/smar-ai`
- [ ] Dependencies installed: `npm install` (both server & client)
- [ ] `.env` file created and configured
- [ ] File permissions correct

#### Backend Configuration
- [ ] `server/.env` configured
- [ ] All environment variables set
- [ ] PM2 installed globally
- [ ] Backend started with PM2
- [ ] PM2 startup configured
- [ ] PM2 logs checked

#### Frontend Configuration
- [ ] `client/npm run build` completed successfully
- [ ] `dist/` folder created
- [ ] Nginx installed and configured
- [ ] Nginx config points to dist folder
- [ ] Nginx restarted and running

#### HTTPS Configuration
- [ ] Domain DNS pointed to VPS
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] Nginx configured for HTTPS
- [ ] HTTP redirects to HTTPS

#### Post-Deployment
- [ ] Frontend loads over HTTPS
- [ ] API requests successful
- [ ] Analysis feature working
- [ ] PM2 monitoring running
- [ ] Logs checked for errors
- [ ] Firewall rules verified

---

## Testing Checklist

### Endpoint Testing
- [ ] Backend health check: `curl https://your-backend/api/health`
- [ ] Repository info:
  ```bash
  curl -X POST https://your-backend/api/repo-info \
    -H "Content-Type: application/json" \
    -d '{"repoUrl":"vercel/next.js"}'
  ```

### Frontend Testing
- [ ] Page loads without errors
- [ ] Search bar visible and functional
- [ ] Can enter repository URL
- [ ] Can select analysis type
- [ ] Analysis button is clickable
- [ ] Loading spinner appears during analysis
- [ ] Results display after completion
- [ ] Copy button works
- [ ] No console errors

### Integration Testing
- [ ] Frontend → API connection works
- [ ] API → Ollama connection works
- [ ] API → GitHub connection works
- [ ] Results render correctly
- [ ] No CORS errors
- [ ] Response times acceptable (< 60s)

### Error Handling
- [ ] Invalid repository URL shows error
- [ ] Ollama down shows helpful error
- [ ] GitHub rate limit error handled
- [ ] Network error shows retry option
- [ ] Long response doesn't timeout

---

## Security Checklist

### Code Security
- [ ] No secrets in git history
- [ ] `.env` in `.gitignore`
- [ ] API keys not logged
- [ ] No hardcoded passwords
- [ ] Input validation implemented

### Deployment Security
- [ ] HTTPS enabled (if public)
- [ ] CORS properly configured
- [ ] Only necessary ports exposed
- [ ] Firewall rules configured
- [ ] SSH key-based access only (no passwords)
- [ ] Regular security updates configured

### Data Security
- [ ] No sensitive data in logs
- [ ] Rate limiting considered
- [ ] Request validation implemented
- [ ] HTTPS certificates valid

---

## Performance Checklist

### Backend Performance
- [ ] Response time < 60 seconds for analysis
- [ ] Memory usage reasonable (< 512MB)
- [ ] CPU usage during analysis < 80%
- [ ] No memory leaks in logs
- [ ] Connection pooling if applicable

### Frontend Performance
- [ ] Page load time < 3 seconds
- [ ] No unnecessary re-renders
- [ ] Bundle size reasonable (< 1MB)
- [ ] Images optimized
- [ ] CSS minified
- [ ] JavaScript minified

### Network Performance
- [ ] CDN configured (if using Netlify)
- [ ] Caching headers set
- [ ] Compression enabled
- [ ] API response time acceptable
- [ ] No unnecessary API calls

---

## Monitoring Checklist

### Logging
- [ ] Backend logs being captured
- [ ] Frontend console logs accessible
- [ ] Error logs centralized
- [ ] Log rotation configured

### Monitoring
- [ ] Health checks configured
- [ ] Uptime monitoring enabled
- [ ] Error alerts configured
- [ ] Performance alerts configured

### Documentation
- [ ] Deployment documented
- [ ] Troubleshooting steps written
- [ ] Configuration documented
- [ ] Runbook created

---

## Post-Deployment Maintenance

### Daily
- [ ] Check monitoring dashboard
- [ ] Review error logs
- [ ] Verify services running

### Weekly
- [ ] Check performance metrics
- [ ] Review usage patterns
- [ ] Update monitoring as needed

### Monthly
- [ ] Review and optimize costs
- [ ] Update dependencies (if applicable)
- [ ] Review security updates
- [ ] Backup critical data (if applicable)

---

## Rollback Checklist

If something goes wrong:

### Immediate Actions
- [ ] Identify the problem
- [ ] Stop serving traffic (if possible)
- [ ] Check recent changes
- [ ] Review error logs

### Rollback Process
- [ ] For Docker: `git checkout <previous-commit>`, rebuild
- [ ] For Railway: Redeploy previous version from Deployments tab
- [ ] For Netlify: Click "Publish deploy" on previous successful deployment
- [ ] For VPS: Git revert, restart services

### Verification
- [ ] Services running correctly
- [ ] No errors in logs
- [ ] Endpoints responding
- [ ] Frontend loading

---

## Sign-Off

When all checks are complete:

- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Team aware of deployment
- [ ] Ready for production use

**Deployment Date:** _______________

**Deployed By:** _______________

**Verification Date:** _______________

**Verified By:** _______________

---

## Notes

Use this space for any special notes or issues encountered:

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**Remember:** When in doubt, test locally first before deploying to production!
