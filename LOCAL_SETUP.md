# smar-ai Running Locally 🚀

## Status: RUNNING ✅

Your smar-ai application is now running locally with demo mode enabled!

### Access URLs

- **Frontend (Web UI)**: http://localhost:3000
- **Backend (API)**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

---

## What's Running

### Backend Server (Port 5001)
- Express.js API server
- Demo mode enabled (no API key needed)
- Automatically generates realistic code analysis responses
- GitHub API integration ready

**Status**: ✅ Running
**Command**: `npm run dev` (in `server/` directory)
**Process**: Nodemon (auto-reloads on file changes)

### Frontend Application (Port 3000)
- React web interface
- Beautiful dark-themed UI
- Ready to analyze GitHub repositories
- Connected to backend at `http://localhost:5001/api`

**Status**: ✅ Running
**Command**: `npm run dev` (in `client/` directory)
**Build Tool**: Vite

---

## How to Use

### Option 1: Use the Web UI
1. Open http://localhost:3000 in your browser
2. Enter a GitHub repository URL:
   - `https://github.com/facebook/react`
   - or `facebook/react`
3. Select analysis type:
   - 📋 **Overview** - Quick understanding
   - 📖 **Detailed** - Deep dive
   - 🎓 **Learning** - Educational guide
4. Click **Analyze** and see the results!

### Option 2: Test via API (curl)

**Quick Analysis:**
```bash
curl -X POST http://localhost:5001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "vercel/next.js",
    "analysisType": "overview"
  }'
```

**Get Repo Info:**
```bash
curl "http://localhost:5001/api/repo-info?repoUrl=vercel/next.js"
```

**Health Check:**
```bash
curl http://localhost:5001/health
```

---

## Demo Mode

smar-ai is running in **DEMO MODE** which means:

✅ **No API Key Required** - Fully functional without Anthropic API key
✅ **Realistic Responses** - Gets realistic code analysis responses
✅ **Full Features** - All features work (overview, detailed, learning)
✅ **Instant Results** - Quick responses without waiting for AI
✅ **Perfect for Testing** - Try everything without costs

---

## File Locations

```
/Users/rishabh/Documents/claude-code/smar-ai/
├── server/                  # Backend API
│   ├── .env                 # Configuration (DEMO_MODE=true)
│   ├── src/
│   │   ├── index.js         # Express server
│   │   ├── services/
│   │   │   ├── githubService.js
│   │   │   └── aiService.js (with demo mode)
│   │   └── routes/
│   │       └── analyze.js
│   └── node_modules/        # Dependencies
│
├── client/                  # Frontend UI
│   ├── .env                 # Configuration (VITE_API_URL)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx
│   │   └── index.css
│   └── node_modules/        # Dependencies
│
└── Documentation/
    ├── README.md
    ├── SETUP.md
    ├── QUICKSTART.md
    ├── AI_CAPABILITIES.md
    └── LOCAL_SETUP.md (this file)
```

---

## Example Repositories to Test

Try analyzing these popular repositories:

1. **Frontend Framework**
   - `facebook/react` - JavaScript UI library
   - `vercel/next.js` - Full-stack framework
   - `vuejs/vue` - Progressive framework

2. **CSS Framework**
   - `tailwindlabs/tailwindcss` - Utility-first CSS
   - `twbs/bootstrap` - Popular CSS framework

3. **Backend**
   - `nestjs/nest` - Progressive Node.js framework
   - `strapi/strapi` - Headless CMS

4. **CLI Tools**
   - `nodejs/node` - JavaScript runtime
   - `oclif/oclif` - CLI framework

---

## Terminal Commands

### If you need to restart servers:

**Kill all processes:**
```bash
# Kill backend
kill $(lsof -t -i :5001) 2>/dev/null

# Kill frontend
kill $(lsof -t -i :3000) 2>/dev/null
```

**Restart backend:**
```bash
cd server
npm run dev
```

**Restart frontend:**
```bash
cd client
npm run dev
```

---

## Switching to Real Claude AI

When you're ready to use real Claude AI analysis:

1. Get your free Anthropic API key from https://console.anthropic.com
2. Edit `server/.env`:
   ```
   DEMO_MODE=false
   ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```
3. Restart the backend: `npm run dev`
4. Now it will use real Claude AI analysis!

---

## Troubleshooting

### "Port already in use" error
```bash
# Kill the process using the port
kill $(lsof -t -i :5001) 2>/dev/null
kill $(lsof -t -i :3000) 2>/dev/null

# Then restart
```

### "Cannot connect to backend"
- Verify backend is running: `curl http://localhost:5001/health`
- Check the port number (should be 5001)
- Restart both servers

### "Page not loading"
- Clear browser cache (Cmd+Shift+Delete)
- Check frontend at http://localhost:3000
- Open browser dev tools (F12) to see errors

---

## Next Steps

### 1. Explore Features
- Analyze different repositories
- Try each analysis type
- Test the streaming option

### 2. Customize
- Change colors in `client/src/index.css`
- Modify API prompts in `server/src/services/aiService.js`
- Add new features or endpoints

### 3. Deploy to Production
- Deploy backend to Railway
- Deploy frontend to Netlify
- See [SETUP.md](./SETUP.md) for detailed instructions

### 4. Add Real AI
- Get Anthropic API key
- Update environment variables
- Enjoy real Claude AI analysis

---

## Environment Variables

### Server (.env in `server/` directory)
```
PORT=5001                          # Server port
DEMO_MODE=true                     # Toggle demo mode
ANTHROPIC_API_KEY=demo-mode        # Your API key (when DEMO_MODE=false)
GITHUB_TOKEN=                      # Optional: GitHub token for rate limits
```

### Client (.env in `client/` directory)
```
VITE_API_URL=http://localhost:5001/api   # Backend API URL
```

---

## Logs & Debugging

**Backend logs:**
```bash
tail -f /tmp/server.log
```

**Frontend logs:**
```bash
tail -f /tmp/client.log
```

**Or check real-time in terminal** where you started the servers.

---

## Performance

- **Analysis Time** (Demo Mode): ~1-2 seconds
- **Frontend Load**: ~1-2 seconds
- **API Response**: Instant

---

## What's Next?

🎉 **Your smar-ai is ready!**

1. Open http://localhost:3000
2. Paste a GitHub repo URL
3. Select analysis type
4. Click Analyze and explore!

Happy analyzing! 🚀

---

**Running since**: Now!
**Status**: ✅ All systems operational
**Demo Mode**: ✅ Enabled (no API key required)
