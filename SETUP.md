# smar-ai Setup Guide

Your Code, Remembered. An AI-powered GitHub repository analyzer.

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Anthropic API Key** (get from [console.anthropic.com](https://console.anthropic.com))
- **GitHub Account** (optional, for higher API rate limits)

## Project Structure

```
smar-ai/
├── server/              # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── index.js
│   │   ├── services/
│   │   │   ├── githubService.js
│   │   │   └── aiService.js
│   │   └── routes/
│   │       └── analyze.js
│   ├── .env.example
│   └── package.json
├── client/              # Frontend (React/Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── netlify.toml
│   └── package.json
└── README.md
```

## Local Development Setup

### 1. Backend Setup

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and add your credentials:
```
PORT=5000
ANTHROPIC_API_KEY=sk-ant-xxxxx
GITHUB_TOKEN=ghp_xxxxx  # Optional
```

Install dependencies and run:
```bash
npm install
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd client
cp .env.example .env
```

Install dependencies and run:
```bash
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

## How AI Is Used in smar-ai

### Claude API Integration

We use **Claude Opus 4.5** from Anthropic for intelligent code analysis:

1. **Code Overview Generation**
   - Analyzes project structure and purpose
   - Identifies tech stack and architecture
   - Explains key components and dependencies

2. **Detailed Code Explanation**
   - Provides in-depth analysis of code files
   - Explains data flow and algorithms
   - Suggests improvements

3. **Learning Guide Creation**
   - Creates step-by-step learning paths
   - Explains prerequisites and core concepts
   - Provides hands-on activities

### AI Capabilities Used

- **Context Understanding**: Claude reads and comprehends code across multiple files
- **Pattern Recognition**: Identifies design patterns and architectural approaches
- **Documentation Generation**: Creates clear, structured explanations
- **Learning Customization**: Adapts content to different learning levels
- **Real-time Streaming**: Uses streaming API for faster perception of results

### Example: How Analysis Works

1. User provides GitHub repo URL
2. App fetches repository metadata and code files from GitHub API
3. Claude API receives the code samples and generates analysis:
   ```
   Repository: facebook/react
   Files: 20 code files
   Output: Comprehensive overview of React's architecture
   ```
4. Results are displayed with syntax highlighting and formatting

## API Endpoints

### POST `/api/analyze`
Analyze a GitHub repository

**Request:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "analysisType": "overview"
}
```

**Analysis Types:**
- `overview`: Quick understanding of the project
- `detailed`: In-depth code explanation
- `learning`: Step-by-step learning guide

**Response:**
```json
{
  "success": true,
  "repository": {
    "name": "repo",
    "owner": "owner",
    "description": "...",
    "language": "JavaScript",
    "stars": 1000
  },
  "analysisType": "overview",
  "analysis": "Generated analysis text...",
  "filesAnalyzed": 15,
  "timestamp": "2025-02-04T..."
}
```

### POST `/api/analyze-stream`
Same as above but streams results in real-time using Server-Sent Events (SSE)

### GET `/api/repo-info`
Get repository metadata without full analysis

**Query Parameters:**
- `repoUrl`: GitHub repository URL

## Deployment

### Railway (Backend)

1. Push your code to GitHub
2. Visit [railway.app](https://railway.app)
3. Create new project → Import from GitHub
4. Select your `smar-ai` repository
5. Set environment variables:
   - `ANTHROPIC_API_KEY`
   - `GITHUB_TOKEN` (optional)
   - `PORT` (auto-set by Railway)

6. Deploy and get your Railway URL (e.g., `https://smar-ai-prod.railway.app`)

### Netlify (Frontend)

1. Push your code to GitHub
2. Visit [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Select your repository
5. Build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

6. Set environment variables:
   - `VITE_API_URL=https://your-railway-url.railway.app/api`

7. Deploy automatically on each push

## Features & Future Enhancements

### Current Features ✅
- GitHub repository analysis with AI
- Multiple analysis types (overview, detailed, learning)
- Real-time streaming results
- Responsive UI with dark theme
- Copy and download analysis results

### Planned Features 🚀
- **Repository Comparison**: Compare two repositories
- **Code Quality Metrics**: Identify issues and improvements
- **Custom Prompts**: Users can ask specific questions about code
- **History & Bookmarks**: Save favorite analyses
- **Export Formats**: PDF, Word, HTML exports
- **Team Collaboration**: Share analyses with team members
- **API Rate Limiting**: Premium tier with higher limits
- **Browser Extension**: Quick analysis from GitHub
- **CLI Tool**: Command-line interface
- **Code Search**: Find specific patterns across repositories

## Troubleshooting

### "ANTHROPIC_API_KEY not found"
- Ensure `.env` file is created in `server/` directory
- Check your API key is correct (starts with `sk-ant-`)

### "Invalid GitHub URL"
- Use full URL format: `https://github.com/owner/repo`
- Or short format: `owner/repo`

### "Rate limit exceeded"
- Add `GITHUB_TOKEN` to bypass GitHub API rate limits
- Generate token at [github.com/settings/tokens](https://github.com/settings/tokens)

### CORS errors in production
- Ensure `VITE_API_URL` in Netlify environment points to correct Railway URL
- Update `netlify.toml` with your Railway domain

## Local Testing

Test the backend health:
```bash
curl http://localhost:5000/health
```

Test analysis endpoint:
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/tailwindlabs/tailwindcss",
    "analysisType": "overview"
  }'
```

## Technology Stack

**Backend:**
- Node.js + Express
- Anthropic Claude API
- GitHub API
- Axios for HTTP requests

**Frontend:**
- React 19
- Vite
- CSS3 with CSS variables
- Axios for API calls

**Deployment:**
- Railway (Backend)
- Netlify (Frontend)

## Contributing

Want to add features? Here's how:

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make changes
3. Commit: `git commit -m "Add feature description"`
4. Push and create a Pull Request

## License

ISC License - Feel free to use for your projects!

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API documentation at [console.anthropic.com](https://console.anthropic.com)

---

**Built with ❤️ using Claude AI**
