# Getting Started with smar-ai

Welcome to smar-ai! This guide will help you get up and running in minutes.

## What You Have

You now have a **complete, production-ready GitHub repository analyzer** that uses Claude AI to understand and explain code.

### What's Included ✅

**Backend (Node.js + Express):**
- Express API server
- GitHub repository fetching
- Claude AI integration
- Real-time streaming
- Error handling
- Environment configuration
- Ready for Railway deployment

**Frontend (React + Vite):**
- Beautiful dark-themed UI
- Responsive design (mobile-friendly)
- Real-time result display
- Copy/download functionality
- Markdown rendering
- Loading states
- Error handling
- Ready for Netlify deployment

**Documentation:**
- Complete setup guide
- Quick start guide
- API reference
- AI capabilities explained
- Project summary
- This guide!

---

## Prerequisites

Before you start, make sure you have:

1. **Node.js 16 or higher**
   - Download from [nodejs.org](https://nodejs.org)
   - Verify: `node --version`

2. **Anthropic API Key** (FREE)
   - Get one at [console.anthropic.com](https://console.anthropic.com)
   - It will look like: `sk-ant-xxxxxxxxxxxxx`

3. **Git** (optional but recommended)
   - Already installed on macOS/Linux
   - Download from [git-scm.com](https://git-scm.com) if needed

---

## Option 1: Quick Local Run (5 minutes)

### Step 1: Install Dependencies

```bash
cd /path/to/smar-ai

# Install all dependencies at once
npm run install-all
```

### Step 2: Setup Environment Variables

**Backend Configuration:**

```bash
cd server
nano .env  # or use any text editor
```

Add these lines:
```
PORT=5000
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Replace `sk-ant-your-key-here` with your actual API key from console.anthropic.com

Optional: Add GitHub token for higher rate limits
```
GITHUB_TOKEN=ghp_your-optional-github-token
```

**Frontend Configuration:**

```bash
cd ../client
nano .env
```

The file already has:
```
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Start Both Services

Open two terminal windows (or tabs):

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

You should see:
```
🚀 smar-ai server running on port 5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

You should see:
```
Local:   http://localhost:3000/
```

### Step 4: Try It Out!

1. Open http://localhost:3000 in your browser
2. Enter a GitHub repository URL:
   - `https://github.com/vercel/next.js`
   - or just `vercel/next.js`
3. Select analysis type
4. Click "Analyze" and wait for results!

---

## Option 2: Command-Line Testing (Without UI)

Test the API directly using curl:

```bash
# Make sure backend is running first!

# Quick analysis
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "vercel/next.js",
    "analysisType": "overview"
  }'

# Get repository info (fast)
curl "http://localhost:5000/api/repo-info?repoUrl=vercel/next.js"

# Health check
curl http://localhost:5000/health
```

---

## Next Steps

### 1. Explore Features

Try analyzing different types of repositories:

```
Frontend: https://github.com/facebook/react
Backend: https://github.com/nestjs/nest
CLI: https://github.com/oclif/oclif
Utils: https://github.com/lodash/lodash
ML: https://github.com/tensorflow/tensorflow
```

Try different analysis types:
- **Overview** - Quick understanding
- **Detailed** - Deep dive
- **Learning** - Educational guide

Enable "Stream Results" checkbox to see real-time analysis!

### 2. Customize

Edit the frontend theme in `client/src/index.css`:

```css
:root {
  --color-primary: #6366f1;  /* Change primary color */
  --color-background: #0f172a;  /* Change background */
  /* ... more variables */
}
```

Modify AI prompts in `server/src/services/aiService.js`:

```javascript
const prompt = `Your custom prompt here...`
```

### 3. Deploy to Production

#### Deploy Backend to Railway

```bash
1. Visit https://railway.app
2. Sign up or log in
3. Click "New Project" → "Deploy from GitHub"
4. Select your smar-ai repository
5. Add environment variables:
   - ANTHROPIC_API_KEY = sk-ant-xxxxx
   - GITHUB_TOKEN = ghp_xxxxx (optional)
6. Click Deploy
7. Get your Railway URL: https://smar-ai-prod.railway.app
```

#### Deploy Frontend to Netlify

```bash
1. Visit https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Build settings:
   - Base directory: client
   - Build command: npm run build
   - Publish directory: dist
5. Add environment variable:
   - VITE_API_URL = https://smar-ai-prod.railway.app/api
   (replace with your Railway URL)
6. Click "Deploy site"
7. Get your Netlify URL
```

See [SETUP.md](./SETUP.md) for detailed deployment steps.

### 4. Add More Features

Some ideas to extend smar-ai:

- Compare two repositories
- Add code quality metrics
- Let users ask custom questions
- Save favorite analyses
- Export to PDF/HTML
- Browser extension

See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for planned features.

---

## Troubleshooting

### "Module not found" error

**Solution:** Make sure you ran `npm run install-all`

```bash
cd /path/to/smar-ai
npm run install-all
```

### "API key not found" error

**Solution:** Create `.env` file in `server/` directory

```bash
cd server
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### "Cannot connect to backend" error

**Solution:** Make sure backend is running

```bash
# Check backend is running on port 5000
curl http://localhost:5000/health

# If not running:
cd server
npm run dev
```

### "Invalid GitHub URL" error

**Solution:** Use correct URL format

- ✅ `https://github.com/owner/repo`
- ✅ `owner/repo`
- ❌ `github.com/owner/repo` (missing https://)
- ❌ `owner-repo` (no slash)

### Slow analysis or rate limit errors

**Solution:** Add GitHub token to increase rate limits

```bash
1. Get token: https://github.com/settings/tokens
2. Add to server/.env:
   GITHUB_TOKEN=ghp_your_token_here
3. Restart server
```

### Port already in use

**Solution:** Use a different port

```bash
# Change port in server/.env
PORT=5001

# Or kill the process using the port
lsof -i :5000  # Show what's using port 5000
kill -9 <PID>  # Kill the process
```

---

## Documentation Map

- **[README.md](./README.md)** - Full project documentation
- **[SETUP.md](./SETUP.md)** - Detailed setup and deployment
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute quick start
- **[API.md](./API.md)** - Complete API reference
- **[AI_CAPABILITIES.md](./AI_CAPABILITIES.md)** - How AI powers smar-ai
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Project overview
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - This file!

---

## Project Structure Quick Reference

```
smar-ai/
├── server/                 # Backend
│   ├── src/
│   │   ├── index.js       # Express server
│   │   ├── services/
│   │   │   ├── githubService.js    # GitHub API
│   │   │   └── aiService.js        # Claude AI
│   │   └── routes/
│   │       └── analyze.js          # API endpoints
│   └── .env.example
│
├── client/                 # Frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx
│   │   └── index.css      # Global styles
│   └── .env.example
│
└── Documentation files (README, SETUP, etc.)
```

---

## Key Technologies

- **Backend:** Node.js, Express, Claude API
- **Frontend:** React 19, Vite, Axios
- **Deployment:** Railway (backend), Netlify (frontend)
- **APIs:** GitHub API, Anthropic Claude API

---

## Common Commands

```bash
# Install dependencies
npm run install-all

# Run both frontend and backend
npm run dev

# Run only backend
cd server && npm run dev

# Run only frontend
cd client && npm run dev

# Build for production
npm run build

# Test API endpoints
curl http://localhost:5000/api/analyze -H "Content-Type: application/json" \
  -d '{"repoUrl":"vercel/next.js","analysisType":"overview"}'
```

---

## Tips & Tricks

1. **Enable Streaming** - Check "Stream Results" for faster perceived performance

2. **Start with Overview** - Use "overview" mode first to understand the project

3. **Try Popular Repos** - Analyze well-known repos to see how the analysis works

4. **Check Environment** - Make sure ANTHROPIC_API_KEY is set correctly

5. **Monitor Tokens** - Watch your API token usage at console.anthropic.com

6. **Read Code Comments** - Backend and frontend code is well-commented

---

## Getting Help

- 🐛 **Found a bug?** - Open issue on GitHub
- ❓ **Have a question?** - Start a discussion on GitHub
- 📖 **Need help?** - Check the [SETUP.md](./SETUP.md) guide
- 🤖 **Learn about AI** - Read [AI_CAPABILITIES.md](./AI_CAPABILITIES.md)

---

## What to Do Next

### For Learning:
1. Analyze your favorite GitHub projects
2. Read the generated analyses
3. Compare different analysis types
4. Check out the AI prompts in the code

### For Development:
1. Deploy to Railway and Netlify
2. Customize colors and theme
3. Add custom analysis types
4. Implement new features

### For Contributing:
1. Fork the repository
2. Create a feature branch
3. Make improvements
4. Submit a pull request

---

## Success! 🎉

You now have:
- ✅ A working GitHub analyzer
- ✅ Beautiful UI
- ✅ AI-powered analysis
- ✅ Complete documentation
- ✅ Ready-to-deploy code

**What's next?**
- Analyze your first repository!
- Deploy to production
- Share with your team
- Contribute improvements

---

**Made with ❤️ using Claude AI**

*Happy analyzing!* 🚀
