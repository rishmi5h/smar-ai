import axios from 'axios';

const OLLAMA_API_BASE = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:latest'; // Default model

// Helper function to call Ollama API
const callOllama = async (prompt, maxTokens = 2000) => {
  try {
    console.log(`Calling Ollama: ${OLLAMA_MODEL} at ${OLLAMA_API_BASE}/generate`);

    const response = await axios.post(`${OLLAMA_API_BASE}/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      num_predict: maxTokens,
      temperature: 0.7,
    }, {
      timeout: 300000 // 5 minutes timeout for long responses
    });

    return response.data.response || '';
  } catch (error) {
    console.error('Ollama API error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: `${OLLAMA_API_BASE}/generate`,
      model: OLLAMA_MODEL
    });
    throw new Error(`Ollama API failed: ${error.message}. Check if model "${OLLAMA_MODEL}" is available and Ollama is running at ${OLLAMA_API_BASE}`);
  }
};

// Generate code overview
export const generateCodeOverview = async (metadata, codeSnippets) => {
  // Limit snippets to reduce token count
  const limitedSnippets = codeSnippets.slice(0, 5);
  const snippetText = limitedSnippets
    .map(s => {
      const contentStr = typeof s.content === 'string' ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join('\n');

  const prompt = `Analyze this GitHub repository and provide a brief overview:

Repository: ${metadata.name}
Language: ${metadata.language || 'Unknown'}
Description: ${metadata.description || 'No description'}

Code samples:
${snippetText}

Provide:
1. Project Purpose - What does this project do?
2. Tech Stack - Main technologies used
3. Architecture - How is the code organized?
4. Key Components - Main modules/components

Keep response concise and clear.`;

  return await callOllama(prompt, 1000);
};

// Generate detailed code explanation
export const generateCodeExplanation = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 5);
  const snippetText = limitedSnippets
    .map(s => {
      const contentStr = typeof s.content === 'string' ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join('\n');

  const prompt = `Provide a detailed explanation of this code repository:

Repository: ${metadata.name}
Language: ${metadata.language || 'Unknown'}
Description: ${metadata.description || 'No description'}

Code files:
${snippetText}

Explain:
1. File Structure - What each file does
2. Data Flow - How data moves through the application
3. Key Patterns - Important design patterns used
4. Main Functions - Explain the main functions
5. Setup & Configuration - How to set up this project

Use simple language and provide examples where helpful.`;

  return await callOllama(prompt, 1500);
};

// Generate learning guide for the codebase
export const generateLearningGuide = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 5);
  const snippetText = limitedSnippets
    .map(s => {
      const contentStr = typeof s.content === 'string' ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join('\n');

  const prompt = `Create a learning guide for understanding this codebase:

Repository: ${metadata.name}
Language: ${metadata.language || 'Unknown'}
Description: ${metadata.description || 'No description'}

Code samples:
${snippetText}

Create a guide with:
1. Prerequisites - Knowledge needed
2. Learning Path - Steps to learn this codebase
3. Core Concepts - Key ideas to understand
4. Hands-on Exercises - Practical activities
5. Common Pitfalls - Things to avoid
6. Resources - Helpful materials

Make it beginner-friendly and concise.`;

  return await callOllama(prompt, 1500);
};

// Streaming version for real-time analysis
export const streamCodeAnalysis = async (metadata, codeSnippets, analysisType = 'overview') => {
  const snippetText = codeSnippets
    .map(s => {
      const contentStr = typeof s.content === 'string' ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr}\n\`\`\``;
    })
    .join('\n');

  let prompt = '';

  if (analysisType === 'overview') {
    prompt = `Analyze this repository and provide a quick overview:

Repository: ${metadata.name}
Language: ${metadata.language || 'Unknown'}
Description: ${metadata.description || 'No description'}

${snippetText}

Provide a concise overview of the project's purpose, main components, and how they work together.`;
  } else if (analysisType === 'detailed') {
    prompt = `Provide a detailed explanation of this codebase:

Repository: ${metadata.name}
${snippetText}

Explain the code in detail, including purpose, flow, and key functions.`;
  } else {
    prompt = `Create a learning guide for this repository:

Repository: ${metadata.name}
${snippetText}

Create a comprehensive learning guide with prerequisites, learning path, and hands-on activities.`;
  }

  // Create async generator for streaming
  return {
    [Symbol.asyncIterator]: async function* () {
      try {
        const response = await axios.post(`${OLLAMA_API_BASE}/generate`, {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: true,
          temperature: 0.7,
        }, {
          timeout: 120000,
          responseType: 'stream'
        });

        const stream = response.data;

        for await (const chunk of stream) {
          const lines = chunk.toString().split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                if (json.response) {
                  yield {
                    type: 'content_block_delta',
                    delta: { type: 'text_delta', text: json.response }
                  };
                }
              } catch (e) {
                // Skip parse errors, continue with next line
              }
            }
          }
        }
      } catch (error) {
        console.error('Ollama streaming error:', error.message);
        throw new Error(`Ollama streaming failed: ${error.message}`);
      }
    }
  };
};
