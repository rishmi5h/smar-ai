# smar-ai Quick Start Guide

Get started with smar-ai in 5 minutes!

## Prerequisites

- Node.js 16+ ([download](https://nodejs.org))
- Anthropic API Key ([get free](https://console.anthropic.com))
- GitHub repository URL to analyze

## 1. Clone & Setup

```bash
git clone https://github.com/yourusername/smar-ai.git
cd smar-ai

# Install all dependencies
npm run install-all
```

## 2. Configure Environment Variables

### Backend Setup

```bash
cd server
nano .env  # or use your editor
```

Add these variables:
```
PORT=5000
ANTHROPIC_API_KEY=sk-ant-your-key-here
GITHUB_TOKEN=ghp_optional  # Optional for higher rate limits
```

### Frontend Setup

```bash
cd ../client
nano .env  # or use your editor
```

Add this variable:
```
VITE_API_URL=http://localhost:5000/api
```

## 3. Run Locally

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Backend runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:3000
```

## 4. Use smar-ai

1. Open `http://localhost:3000`
2. Paste a GitHub repository URL:
   - Full: `https://github.com/vercel/next.js`
   - Short: `vercel/next.js`
3. Choose analysis type:
   - 📋 **Overview** - Quick understanding
   - 📖 **Detailed** - Deep dive
   - 🎓 **Learning** - Educational guide
4. Click **Analyze** and wait for results!

## Example Repositories to Try

```
# Frontend Framework
https://github.com/facebook/react
https://github.com/vercel/next.js

# CSS Framework
https://github.com/tailwindlabs/tailwindcss

# Backend
https://github.com/nestjs/nest
https://github.com/strapi/strapi

# Data Science
https://github.com/tensorflow/tensorflow
https://github.com/pytorch/pytorch
```

## Features to Explore

### 📋 Analysis Types

- **Overview**: Get quick insights about the project purpose and structure
- **Detailed**: Understand code architecture, algorithms, and design patterns
- **Learning**: Get a step-by-step guide to understand the codebase

### ⚡ Real-time Streaming

Enable "Stream Results (Real-time)" to see analysis as it's generated!

### 📥 Export Options

- **Copy**: Copy analysis to clipboard
- **Download**: Save as markdown file

## How AI Powers smar-ai

smar-ai uses **Claude Opus 4.5** AI to:

1. **Fetch Code** - Gets repository files from GitHub
2. **Analyze** - Claude reads and understands the code
3. **Generate** - Creates comprehensive explanations
4. **Stream** - Sends results in real-time
5. **Display** - Shows beautifully formatted analysis

## Troubleshooting

### "API Key not found" Error
- Make sure `server/.env` exists
- Check your API key starts with `sk-ant-`
- Get a free key at [console.anthropic.com](https://console.anthropic.com)

### "Cannot connect to backend"
- Make sure backend is running on `http://localhost:5000`
- Check no other app is using port 5000
- Try: `lsof -i :5000` to see what's using the port

### "Invalid GitHub URL"
- Use format: `owner/repo` or `https://github.com/owner/repo`
- Make sure the repository exists
- Try: `https://github.com/vercel/next.js`

### Rate limit exceeded
- Add `GITHUB_TOKEN` to `server/.env`
- Generate token: [github.com/settings/tokens](https://github.com/settings/tokens)

## Next Steps

1. **Deploy to Cloud**
   - [Deploy Backend to Railway](./SETUP.md#railway-backend)
   - [Deploy Frontend to Netlify](./SETUP.md#netlify-frontend)

2. **Add Features**
   - Repository comparison
   - Code quality metrics
   - Custom analysis prompts

3. **Learn More**
   - Read [SETUP.md](./SETUP.md) for detailed setup
   - Check [README.md](./README.md) for full documentation
   - Explore API endpoints in [SETUP.md#api-endpoints](./SETUP.md#api-endpoints)

## API Quick Reference

### Analyze Repository
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "vercel/next.js",
    "analysisType": "overview"
  }'
```

### Get Repository Info
```bash
curl http://localhost:5000/api/repo-info?repoUrl=vercel/next.js
```

## Tips & Tricks

1. **Long Analyses** - For large projects, "Detailed" and "Learning" analyses might take longer. Use "Stream Results" to see progress!

2. **Supported Languages** - Works best with:
   - JavaScript/TypeScript
   - Python
   - Java
   - Go
   - Rust
   - C++
   - And many more!

3. **Repository Size** - Works better with repositories that have:
   - Clear structure
   - Meaningful file/folder names
   - Good documentation
   - Focused scope

4. **Custom Domains** - After deploying:
   - Railway gives you a URL like: `smar-ai-prod.railway.app`
   - Update Netlify environment: `VITE_API_URL=https://smar-ai-prod.railway.app/api`

## Getting Help

- 🐛 Report bugs: [GitHub Issues](https://github.com/yourusername/smar-ai/issues)
- 💬 Ask questions: [GitHub Discussions](https://github.com/yourusername/smar-ai/discussions)
- 📧 Contact: your-email@example.com

## What's Next?

Once you're comfortable with smar-ai:

1. **Deploy to production** - Get your own live version
2. **Customize** - Add your own branding and features
3. **Share** - Tell others about your new code analysis tool
4. **Contribute** - Help improve smar-ai for everyone

Happy analyzing! 🚀

---

**Need detailed setup?** → See [SETUP.md](./SETUP.md)

**Want full documentation?** → See [README.md](./README.md)
