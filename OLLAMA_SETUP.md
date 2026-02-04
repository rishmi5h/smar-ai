# smar-ai with Ollama Setup Guide

This guide shows how to run smar-ai with **Ollama** for local AI-powered code analysis.

## What is Ollama?

Ollama allows you to run large language models locally on your machine - completely free and private. No API keys or subscriptions required!

## Prerequisites

1. **Ollama** - Download from https://ollama.ai
2. **Node.js 16+** - For running the application
3. **smar-ai** - Already installed in your project

## Installation Steps

### Step 1: Install Ollama

1. Visit https://ollama.ai
2. Download and install Ollama for your OS (macOS, Linux, Windows)
3. Follow the installation instructions

### Step 2: Pull an Ollama Model

Ollama requires you to download a model first. Open terminal and run:

```bash
# Default: Mistral (7B) - Fast, good quality
ollama pull mistral

# OR other options:
ollama pull llama2        # Larger, high quality
ollama pull neural-chat   # Optimized for chat
ollama pull dolphin-mixtral  # Most powerful
```

Check available models at: https://ollama.ai/library

**First pull will take 5-10 minutes** depending on your internet speed.

### Step 3: Start Ollama Server

```bash
# Ollama runs in the background automatically
# But you can explicitly start it:
ollama serve

# Or on Windows, just run the Ollama app
```

**Verify it's running:**
```bash
curl http://localhost:11434/api/tags
```

You should see your downloaded models listed.

### Step 4: Configure smar-ai for Ollama

Edit `server/.env`:

```bash
# Server Configuration
PORT=5001

# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434/api
OLLAMA_MODEL=mistral
```

**Change `OLLAMA_MODEL` to match the model you pulled:**
- `mistral` (default, recommended)
- `llama2`
- `neural-chat`
- `dolphin-mixtral`

### Step 5: Start smar-ai

```bash
# In one terminal - Start backend
cd server
npm run dev

# In another terminal - Start frontend
cd client
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:5001

### Step 6: Start Using!

1. Open http://localhost:3000
2. Paste a GitHub repo URL
3. Select analysis type
4. Click "Analyze"

Enjoy local, private AI-powered code analysis! 🚀

---

## Model Comparison

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **Mistral** | 7B | ⚡ Fast | Good | Default choice |
| Llama 2 | 7B | Medium | Very Good | Better quality |
| Neural-Chat | 7B | Fast | Good | Conversations |
| Dolphin-Mixtral | 8x7B | Slower | Excellent | Best quality |

## Performance Tips

### If you have limited RAM:
Use `mistral` model (7B - requires ~4GB RAM)

### If you have more resources:
Use `dolphin-mixtral` or `llama2` for better quality

### Speed up responses:
- Close other applications
- Use a faster model (mistral is fastest)
- Reduce code samples analyzed

## Troubleshooting

### "Connection refused" error
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start Ollama
ollama serve
```

### "Model not found" error
```bash
# List installed models
ollama list

# Pull the model
ollama pull mistral
```

### Slow responses
- First response is slow (model loading)
- Subsequent responses are faster
- Use a smaller model (mistral)
- Close background applications

### Out of memory error
- Use `mistral` (smallest model)
- Reduce number of code files analyzed
- Close other applications

## Advanced Configuration

### Use a remote Ollama server:

Edit `server/.env`:
```
OLLAMA_API_URL=http://your-server-ip:11434/api
```

### Custom model parameters:

Edit `server/src/services/ollamaService.js`:
```javascript
const response = await axios.post(`${OLLAMA_API_BASE}/generate`, {
  model: OLLAMA_MODEL,
  prompt: prompt,
  stream: false,
  temperature: 0.7,  // Adjust creativity (0-1)
  top_p: 0.9,       // Diversity
  num_predict: 2000 // Max tokens
});
```

## API Endpoint Testing

Test Ollama is working:

```bash
# Health check
curl http://localhost:11434/api/tags

# Test analysis endpoint
curl -X POST http://localhost:5001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "vercel/next.js",
    "analysisType": "overview"
  }'
```

## System Requirements

### Minimum (Mistral 7B):
- 4GB RAM
- 5GB disk space
- Decent CPU

### Recommended (Llama 2 or better):
- 8GB RAM
- 10GB disk space
- Good CPU or GPU

### Optimal (GPU acceleration):
- 16GB RAM
- Metal (macOS) or CUDA (NVIDIA) support
- Fast internet for model download

## Benefits of Ollama

✅ **Free** - No API costs or subscriptions
✅ **Private** - Your data never leaves your machine
✅ **Fast** - No network latency to cloud
✅ **Flexible** - Choose different models
✅ **Offline** - Works without internet after setup
✅ **Customizable** - Fine-tune parameters

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull a model
3. ✅ Configure smar-ai
4. ✅ Start servers
5. 🎉 Analyze code!

---

**Questions?**
- Ollama docs: https://ollama.ai
- Model library: https://ollama.ai/library
- smar-ai docs: See README.md

Happy analyzing! 🚀
