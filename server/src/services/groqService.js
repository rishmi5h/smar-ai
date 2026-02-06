import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Helper function to call Groq API
const callGroq = async (prompt, maxTokens = 2000) => {
  try {
    console.log(`Calling Groq: ${GROQ_MODEL}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are smar-ai, an AI-powered code analysis assistant built by rishmi5h. You analyze GitHub repositories and help developers understand codebases. You are powered by Groq.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: GROQ_MODEL,
      max_completion_tokens: maxTokens,
      temperature: 0.7,
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq API error:", {
      message: error.message,
      status: error.status,
      error: error.error,
    });
    throw new Error(
      `Groq API failed: ${error.message}. Check if GROQ_API_KEY is set and model "${GROQ_MODEL}" is available.`,
    );
  }
};

// Generate code overview
export const generateCodeOverview = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 5);
  const snippetText = limitedSnippets
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join("\n");

  const prompt = `Analyze this GitHub repository and provide a brief overview:

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

Code samples:
${snippetText}

Provide:
1. Project Purpose - What does this project do?
2. Tech Stack - Main technologies used
3. Architecture - How is the code organized?
4. Key Components - Main modules/components

Keep response concise and clear.`;

  return await callGroq(prompt, 1000);
};

// Generate detailed code explanation
export const generateCodeExplanation = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 5);
  const snippetText = limitedSnippets
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join("\n");

  const prompt = `Provide a detailed explanation of this code repository:

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

Code files:
${snippetText}

Explain:
1. File Structure - What each file does
2. Data Flow - How data moves through the application
3. Key Patterns - Important design patterns used
4. Main Functions - Explain the main functions
5. Setup & Configuration - How to set up this project

Use simple language and provide examples where helpful.`;

  return await callGroq(prompt, 1500);
};

// Generate learning guide for the codebase
export const generateLearningGuide = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 5);
  const snippetText = limitedSnippets
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join("\n");

  const prompt = `Create a learning guide for understanding this codebase:

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

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

  return await callGroq(prompt, 1500);
};

// Streaming codebase evolution analysis — compares two snapshots
export const streamEvolutionAnalysis = async (
  repoName,
  baseSnippets,
  headSnippets,
  compareStats,
  baseLabel,
  headLabel,
) => {
  const formatSnippets = (snippets) =>
    snippets
      .map((s) => {
        const contentStr =
          typeof s.content === "string" ? s.content : String(s.content);
        return `## ${s.path}\n\`\`\`\n${contentStr.substring(0, 1500)}\n\`\`\``;
      })
      .join("\n\n");

  const prompt = `Compare how the codebase of "${repoName}" evolved between two points in time.

**From:** ${baseLabel}
**To:** ${headLabel}
**Stats:** ${compareStats.totalCommits} commits, ${compareStats.filesChanged} files changed, +${compareStats.additions} additions, -${compareStats.deletions} deletions

---

### CODEBASE AT "${baseLabel}":
${formatSnippets(baseSnippets)}

---

### CODEBASE AT "${headLabel}":
${formatSnippets(headSnippets)}

---

Analyze how the codebase evolved:
1. **Evolution Summary** - What changed at a high level between these two snapshots
2. **New Features / Components** - What was added that didn't exist before
3. **Modified Areas** - What existing code was changed and how
4. **Removed / Replaced** - What was removed or replaced
5. **Architecture Changes** - Any structural or pattern changes
6. **Quality Assessment** - Did the codebase improve, and in what ways

Be specific, reference actual filenames, and explain the "why" behind changes.`;

  return {
    [Symbol.asyncIterator]: async function* () {
      try {
        const stream = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are smar-ai, an AI-powered code analysis assistant built by rishmi5h. You analyze GitHub repositories and help developers understand codebases. You are powered by Groq.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: GROQ_MODEL,
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: content },
            };
          }
        }
      } catch (error) {
        console.error("Groq evolution analysis streaming error:", error.message);
        throw new Error(
          `Groq evolution analysis streaming failed: ${error.message}`,
        );
      }
    },
  };
};

// Streaming chat response for interactive Q&A
export const streamChatResponse = async (
  metadata,
  codeSnippets,
  history,
  question,
) => {
  const snippetText = codeSnippets
    .slice(0, 5)
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join("\n");

  const systemPrompt = `You are smar-ai, an AI-powered code analysis assistant built by rishmi5h and powered by Groq. You help users understand GitHub repositories. Answer questions based on the repository context provided below. Be concise, specific, and reference actual file names and code when relevant.

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

Code files:
${snippetText}

Answer the user's question based on this codebase. If the question is outside the scope of the code provided, say so.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: question },
  ];

  return {
    [Symbol.asyncIterator]: async function* () {
      try {
        const stream = await groq.chat.completions.create({
          messages,
          model: GROQ_MODEL,
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: content },
            };
          }
        }
      } catch (error) {
        console.error("Groq chat streaming error:", error.message);
        throw new Error(`Groq chat streaming failed: ${error.message}`);
      }
    },
  };
};

// Streaming version for real-time analysis
export const streamCodeAnalysis = async (
  metadata,
  codeSnippets,
  analysisType = "overview",
) => {
  const snippetText = codeSnippets
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr}\n\`\`\``;
    })
    .join("\n");

  let prompt = "";

  if (analysisType === "overview") {
    prompt = `Analyze this repository and provide a quick overview:

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

${snippetText}

Provide a concise overview of the project's purpose, main components, and how they work together.`;
  } else if (analysisType === "detailed") {
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
        const stream = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are smar-ai, an AI-powered code analysis assistant built by rishmi5h. You analyze GitHub repositories and help developers understand codebases. You are powered by Groq.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: GROQ_MODEL,
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: content },
            };
          }
        }
      } catch (error) {
        console.error("Groq streaming error:", error.message);
        throw new Error(`Groq streaming failed: ${error.message}`);
      }
    },
  };
};
