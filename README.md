# smar-ai 🧠

> Your Code, Remembered. Understand any GitHub repository with AI-powered analysis.

![License](https://img.shields.io/badge/License-ISC-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v20%2B-brightgreen)
![React](https://img.shields.io/badge/React-19-blue)
![Ollama](https://img.shields.io/badge/Ollama-LLM-orange)

## What is smar-ai?

smar-ai is an intelligent code analyzer that uses **Ollama** (free, local LLM) to understand and explain GitHub repositories. Instead of spending hours reading through code, get a comprehensive analysis in seconds using local AI models.

### Key Features

- 📊 **Smart Analysis** - AI-powered code understanding with local models
- 🎯 **Multiple Formats** - Overview, detailed explanation, or learning guide
- ⚡ **Real-time Streaming** - See results as they're generated
- 🎨 **Beautiful UI** - Modern, responsive interface with syntax highlighting
- 📥 **Export Options** - Copy or download analysis as markdown
- 🔗 **Easy to Use** - Just paste a GitHub URL
- 🚀 **Multiple Deployment Options** - Docker, Railway + Netlify, or VPS
- 🆓 **Free to Use** - Powered by open-source Ollama models

## Quick Start

### Option 1: Docker (Fastest - 5 minutes)

```bash
./scripts/deploy-docker.sh start
open http://localhost:3000
```

### Option 2: Local Development

**Prerequisites:**
- Node.js 20+
- Ollama installed ([download here](https://ollama.ai))

**Setup:**

```bash
# Clone the repository
git clone https://github.com/yourusername/smar-ai.git
cd smar-ai

# Start Ollama (in separate terminal)
ollama pull deepseek-r1:latest
ollama serve

# Backend
cd server
cp .env.example .env
# Edit .env with Ollama settings
npm install
npm run dev

# In a new terminal - Frontend
cd client
npm install
npm run dev
```

Visit `http://localhost:3000`

## How It Works

```mermaid
graph LR
    A[GitHub URL] -->|Fetch Code| B[GitHub API]
    B -->|Code Samples| C[Ollama LLM]
    C -->|Generate Analysis| D[Results]
    D -->|Display| E[Web UI]
```

### Analysis Types

1. **📋 Code Overview** - High-level understanding
   - Project purpose and goals
   - Technology stack
   - Architecture overview
   - Key components

2. **📖 Detailed Explanation** - Deep dive
   - File structure breakdown
   - Data flow and algorithms
   - Design patterns
   - Setup and configuration

3. **🎓 Learning Guide** - Educational
   - Prerequisites
   - Step-by-step learning path
   - Core concepts
   - Hands-on activities

## Using AI in smar-ai

### Ollama Integration

We use **Ollama** with the DeepSeek-R1 model for intelligent analysis:

```javascript
// Example: How we generate analysis
const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
  model: 'deepseek-r1:latest',
  prompt: `Analyze this repository:
    Name: ${repo.name}
    Files: ${codeSnippets}

    Provide: 1. Purpose 2. Tech Stack 3. Architecture`,
  stream: false,
  num_predict: 1500,
  temperature: 0.7,
})
```

### Why Ollama?

- **Free & Open Source** - No API costs, run locally
- **Privacy First** - Your code stays on your machine
- **Offline Capable** - Works without internet
- **Customizable** - Use different models as needed
- **Pattern Recognition** - Identifies design patterns and best practices
- **Real-time Streaming** - Stream responses for instant feedback

**Available Models:**
- DeepSeek-R1 (recommended, detailed reasoning)
- Mistral (fast, lightweight)
- Llama 2 (balanced)
- Neural-Chat (conversation optimized)

## API Reference

### Analyze Repository

**POST** `/api/analyze`

```bash
curl -X POST http://localhost:5050/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/facebook/react",
    "analysisType": "overview"
  }'
```

**Parameters:**
- `repoUrl` (string, required): GitHub repository URL
- `analysisType` (string): `overview`, `detailed`, or `learning`

**Response:**
```json
{
  "success": true,
  "repository": {
    "name": "react",
    "owner": "facebook",
    "description": "...",
    "language": "JavaScript",
    "stars": 200000
  },
  "analysis": "Comprehensive AI-generated analysis...",
  "filesAnalyzed": 15,
  "timestamp": "2025-02-05T..."
}
```

### Stream Analysis

**POST** `/api/analyze-stream`

Get real-time results using Server-Sent Events (SSE).

### Repository Info

**GET** `/api/repo-info?repoUrl=owner/repo`

Get metadata without full analysis.

## Deployment

### Option 1: Docker (Recommended)

```bash
./scripts/deploy-docker.sh start
```

[Full Docker guide →](./DEPLOYMENT.md#option-2-docker-deployment)

### Option 2: Railway + Netlify (Cloud)

**Backend (Railway):**
1. Connect GitHub repository to Railway
2. Set environment variables:
   ```
   OLLAMA_API_URL=http://your-ollama-server:11434/api
   OLLAMA_MODEL=deepseek-r1:latest
   GITHUB_TOKEN=ghp_... (optional)
   PORT=5050
   ```

**Frontend (Netlify):**
1. Connect GitHub repository to Netlify
2. Set build settings:
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Set environment:
   ```
   VITE_API_URL=https://your-railway.railway.app/api
   ```

[Full Railway guide →](./RAILWAY_DEPLOYMENT.md)
[Full Netlify guide →](./NETLIFY_DEPLOYMENT.md)

### Option 3: Traditional VPS

Supports AWS, DigitalOcean, Linode, etc.

[Full VPS guide →](./DEPLOYMENT.md#option-3-traditional-vpscloud)

## Project Structure

```
smar-ai/
├── server/
│   ├── src/
│   │   ├── index.js              # Express server
│   │   ├── services/
│   │   │   ├── githubService.js  # GitHub API integration
│   │   │   └── ollamaService.js  # Ollama AI integration
│   │   └── routes/
│   │       └── analyze.js        # API endpoints
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RepoAnalyzer.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── AnalysisResults.jsx
│   │   │   └── MarkdownRenderer.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── netlify.toml
│   └── vite.config.js
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## Environment Variables

**Server (`server/.env`):**
```
PORT=5050
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_MODEL=deepseek-r1:latest
GITHUB_TOKEN=ghp_xxx  # Optional, for higher GitHub API limits
```

**Client (`client/.env`):**
```
VITE_API_URL=http://localhost:5050/api
```

## Features

### Current ✅
- GitHub repository analysis
- Multiple analysis types
- Real-time streaming
- Modern responsive UI
- Copy/download results
- Syntax highlighting
- Docker support
- Multiple deployment options
- Ollama integration

### Planned 🚀
- Repository comparison
- Code quality metrics
- Custom prompts
- Saved history
- Export to PDF/HTML
- Team collaboration
- Browser extension
- CLI tool

## Tech Stack

**Frontend:**
- React 19
- Vite
- Axios
- Modern CSS3

**Backend:**
- Node.js 20
- Express
- Ollama SDK
- GitHub API

**Deployment:**
- Docker & Docker Compose
- Railway
- Netlify
- Nginx

**AI:**
- Ollama (Local LLM)
- DeepSeek-R1

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m "Add amazing feature"`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## Troubleshooting

**Q: "Cannot reach Ollama API"**
A: Make sure Ollama is running: `ollama serve`

**Q: "Invalid GitHub URL"**
A: Use format `https://github.com/owner/repo` or `owner/repo`

**Q: Docker won't start**
A: Make sure Docker is running and ports 3000, 5050, 11434 are available

**Q: Rate limit errors**
A: Add `GITHUB_TOKEN` for higher GitHub API limits

See [DEPLOYMENT.md](./DEPLOYMENT.md) for more help.

## Roadmap

- [ ] Repository comparison tool
- [ ] Code quality metrics
- [ ] Custom analysis prompts
- [ ] Saved analyses history
- [ ] PDF/HTML export
- [ ] Team collaboration
- [ ] Browser extension
- [ ] CLI tool
- [ ] Advanced filtering
- [ ] Multiple language support

## License

ISC License - See LICENSE file for details

## Support

- 📖 [Full Documentation](./INDEX.md)
- 🚀 [Deployment Guide](./DEPLOYMENT_QUICK_START.md)
- 🐛 [Report Issues](https://github.com/yourusername/smar-ai/issues)
- 💬 [Discussions](https://github.com/yourusername/smar-ai/discussions)

## Acknowledgments

- Powered by [Ollama](https://ollama.ai) for local LLM inference
- Built with [React](https://react.dev) and [Vite](https://vite.dev)
- GitHub integration via [GitHub API](https://docs.github.com/rest)
- Deployed on [Railway](https://railway.app), [Netlify](https://netlify.com), and [Docker](https://docker.com)

---

**Made with ❤️ for code understanding**

[Get Started Now →](./DEPLOYMENT_QUICK_START.md)
