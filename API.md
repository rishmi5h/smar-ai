# smar-ai API Documentation

Complete API reference for smar-ai backend.

## Base URL

- **Local**: `http://localhost:5000`
- **Production**: `https://your-railway-domain.railway.app`

## Authentication

All endpoints are public. No authentication required.

## Endpoints

### 1. Analyze Repository

**Endpoint**: `POST /api/analyze`

Analyze a GitHub repository and get AI-generated analysis.

**Request**:
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/facebook/react",
    "analysisType": "overview"
  }'
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repoUrl` | string | Yes | GitHub repository URL or `owner/repo` format |
| `analysisType` | string | No | Type of analysis: `overview`, `detailed`, or `learning`. Default: `overview` |

**Response** (200):

```json
{
  "success": true,
  "repository": {
    "name": "react",
    "owner": "facebook",
    "description": "A JavaScript library for building user interfaces",
    "language": "JavaScript",
    "stars": 200000,
    "topics": ["javascript", "library", "ui"]
  },
  "analysisType": "overview",
  "analysis": "# React Repository Analysis\n\nReact is a JavaScript library...",
  "filesAnalyzed": 15,
  "timestamp": "2025-02-04T10:30:00Z"
}
```

**Analysis Types**:

- **overview**: Quick understanding of the project purpose and structure (2000 tokens max)
- **detailed**: In-depth explanation of code structure and design patterns (3000 tokens max)
- **learning**: Step-by-step learning guide for understanding the codebase (2500 tokens max)

**Error Responses**:

```json
// 400 - Bad Request
{
  "error": "Invalid GitHub URL or repository path"
}

// 400 - API Error
{
  "error": "Failed to fetch repository metadata: Not Found",
  "details": "Make sure you have set ANTHROPIC_API_KEY and valid GitHub URL"
}

// 500 - Server Error
{
  "error": "Internal server error"
}
```

---

### 2. Stream Analysis

**Endpoint**: `POST /api/analyze-stream`

Analyze repository with real-time streaming results using Server-Sent Events (SSE).

**Request**:
```javascript
// Using Fetch API
const response = await fetch('http://localhost:5000/api/analyze-stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repoUrl: 'facebook/react',
    analysisType: 'overview'
  })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const text = decoder.decode(value)
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      console.log(data)
    }
  }
}
```

**Parameters**: Same as `/api/analyze`

**Response** (Server-Sent Events):

Stream includes multiple events:

```
// Event 1: Metadata
data: {
  "type": "metadata",
  "repository": {...},
  "analysisType": "overview",
  "filesAnalyzed": 15
}

// Event 2-N: Analysis chunks
data: {"type": "analysis_chunk", "text": "# Repository Analysis\n"}
data: {"type": "analysis_chunk", "text": "\nReact is a JavaScript library..."}

// Final Event: Complete
data: {"type": "complete", "timestamp": "2025-02-04T10:30:00Z"}
```

**Event Types**:

| Type | Description |
|------|-------------|
| `metadata` | Repository information and analysis type |
| `analysis_chunk` | Text chunk of the analysis (stream incrementally) |
| `error` | Error message if analysis fails |
| `complete` | Stream completed successfully |

**Usage Example** (JavaScript):

```javascript
async function analyzeRepoStreaming(repoUrl, analysisType) {
  const response = await fetch('/api/analyze-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, analysisType })
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // Keep incomplete line

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          handleEvent(data)
        } catch (e) {
          console.error('Parse error:', e)
        }
      }
    }
  }
}

function handleEvent(event) {
  switch (event.type) {
    case 'metadata':
      console.log('Repository:', event.repository.name)
      break
    case 'analysis_chunk':
      console.log('Content:', event.text)
      break
    case 'complete':
      console.log('Analysis complete')
      break
    case 'error':
      console.error('Error:', event.message)
      break
  }
}
```

---

### 3. Get Repository Info

**Endpoint**: `GET /api/repo-info`

Get repository metadata without full analysis (fast endpoint).

**Request**:
```bash
curl "http://localhost:5000/api/repo-info?repoUrl=facebook/react"
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repoUrl` | string | Yes | GitHub repository URL or `owner/repo` format |

**Response** (200):

```json
{
  "success": true,
  "metadata": {
    "name": "react",
    "owner": "facebook",
    "description": "A JavaScript library for building user interfaces",
    "language": "JavaScript",
    "stars": 200000,
    "topics": ["javascript", "library", "ui"],
    "defaultBranch": "main"
  },
  "filesFound": 15
}
```

**Error Responses**:

```json
// 400 - Missing parameter
{
  "error": "repoUrl is required as query parameter"
}

// 400 - Invalid URL
{
  "error": "Invalid GitHub URL or repository path"
}
```

---

### 4. Health Check

**Endpoint**: `GET /health`

Check if server is running (no authentication required).

**Request**:
```bash
curl http://localhost:5000/health
```

**Response** (200):

```json
{
  "status": "ok",
  "message": "smar-ai server is running"
}
```

---

## Request/Response Format

### Content Types

- **Request**: `Content-Type: application/json`
- **Response**: `application/json` (except for streaming)
- **Streaming**: `text/event-stream`

### URL Formats Supported

All endpoints accept GitHub repository URLs in multiple formats:

```
# Full HTTPS URL
https://github.com/facebook/react

# HTTP URL
http://github.com/facebook/react

# Short format
facebook/react
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 404 | Not found (repository doesn't exist) |
| 429 | Rate limited |
| 500 | Server error |

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message describing the issue",
  "details": "Additional context (if available)"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid GitHub URL" | Wrong URL format | Use `owner/repo` or `https://github.com/owner/repo` |
| "Failed to fetch repository metadata" | Repository doesn't exist | Check repository name and owner |
| "API key not found" | `ANTHROPIC_API_KEY` not set | Add to `server/.env` |
| "Rate limit exceeded" | GitHub API rate limit | Add `GITHUB_TOKEN` to `server/.env` |
| "Internal server error" | Server error | Check server logs |

---

## Rate Limiting

### GitHub API Limits

- **Without token**: 60 requests/hour
- **With token**: 5,000 requests/hour

Add `GITHUB_TOKEN` to `server/.env` for higher limits:
```bash
GITHUB_TOKEN=ghp_your_token_here
```

### Anthropic API Limits

Depends on your API key plan. Check [console.anthropic.com](https://console.anthropic.com) for limits.

---

## Examples

### JavaScript/Node.js

```javascript
// Basic analysis
async function analyzeRepo(repoUrl) {
  const response = await fetch('http://localhost:5000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoUrl,
      analysisType: 'overview'
    })
  })

  const data = await response.json()
  console.log(data.analysis)
}

analyzeRepo('facebook/react')
```

### Python

```python
import requests
import json

def analyze_repo(repo_url, analysis_type='overview'):
    response = requests.post(
        'http://localhost:5000/api/analyze',
        headers={'Content-Type': 'application/json'},
        json={
            'repoUrl': repo_url,
            'analysisType': analysis_type
        }
    )

    data = response.json()
    print(data['analysis'])

analyze_repo('facebook/react', 'detailed')
```

### cURL

```bash
# Overview analysis
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "facebook/react", "analysisType": "overview"}'

# Detailed analysis
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "facebook/react", "analysisType": "detailed"}'

# Learning guide
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "facebook/react", "analysisType": "learning"}'

# Get repo info
curl "http://localhost:5000/api/repo-info?repoUrl=facebook/react"

# Health check
curl http://localhost:5000/health
```

---

## Environment Variables

Required for backend functionality:

```bash
# API Server
PORT=5000

# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Get from https://console.anthropic.com

# Optional (for better GitHub API limits)
GITHUB_TOKEN=ghp_xxxxx  # Get from https://github.com/settings/tokens
```

---

## CORS Configuration

The API is configured with CORS enabled. Requests from any origin are allowed for public demo purposes.

For production, consider restricting to specific origins in `server/src/index.js`:

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}))
```

---

## Performance Tips

1. **Use Streaming for Large Repos**
   - Stream endpoint shows results faster
   - Better perceived performance
   - `overview` type is faster than `detailed`

2. **Cache Results**
   - Store analysis results if analyzing same repo multiple times
   - Implement TTL (time-to-live) for cache

3. **Optimize Code Samples**
   - We automatically select best files
   - Focus on main entry points
   - Limit analysis scope to important files

4. **Rate Limiting**
   - Implement client-side rate limiting
   - Add GitHub token for higher limits

---

## Webhooks & Callbacks

Not currently supported. Consider these alternatives:

1. **Polling**: Periodically call `/api/repo-info`
2. **Background Jobs**: Queue analysis jobs for later
3. **WebSocket**: Real-time bidirectional communication (future)

---

## API Versioning

Current API version: `v1` (implicit in `/api/` path)

Future versions may use `/api/v2/`, `/api/v3/`, etc.

---

## Support

- 🐛 Report issues: [GitHub Issues](https://github.com/yourusername/smar-ai/issues)
- 💬 Ask questions: [GitHub Discussions](https://github.com/yourusername/smar-ai/discussions)
- 📧 Email: support@example.com

---

## Related Documentation

- [Setup Guide](./SETUP.md)
- [AI Capabilities](./AI_CAPABILITIES.md)
- [Quick Start](./QUICKSTART.md)
- [README](./README.md)
