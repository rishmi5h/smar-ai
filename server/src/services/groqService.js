import { providerName } from "./llmProvider.js";
import { chatCompletion, chatCompletionStream } from "./llmFallback.js";

// Strip <think>...</think> reasoning traces from Ollama models
const stripThinkTags = (text) => {
  if (!text) return text;
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<think>[\s\S]*/g, "");
};

const SYSTEM_PROMPT = `You are smar-ai, an AI-powered code analysis assistant built by rishmi5h. You analyze GitHub repositories and help developers understand codebases. You are powered by ${providerName}.`;

// Helper function to call LLM with fallback
const callLLM = async (prompt, maxTokens = 2000) => {
  try {
    const result = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { max_completion_tokens: maxTokens, temperature: 0.7 },
    );
    return stripThinkTags(result.choices[0]?.message?.content || "");
  } catch (error) {
    console.error("LLM API error:", {
      message: error.message,
      status: error.status,
    });
    throw new Error(`LLM API failed: ${error.message}`);
  }
};

// Helper to create a streaming async iterable with fallback
const createStream = (systemPrompt, userPrompt, temperature = 0.7) => {
  return {
    [Symbol.asyncIterator]: async function* () {
      try {
        const stream = await chatCompletionStream(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          { temperature },
        );

        for await (const chunk of stream) {
          const rawContent = chunk.choices[0]?.delta?.content;
          const content = stripThinkTags(rawContent);
          if (content) {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: content },
            };
          }
        }
      } catch (error) {
        console.error("LLM streaming error:", error.message);
        throw new Error(`LLM streaming failed: ${error.message}`);
      }
    },
  };
};

// Helper to create streaming with custom messages (for chat)
const createStreamWithMessages = (messages, temperature = 0.7) => {
  return {
    [Symbol.asyncIterator]: async function* () {
      try {
        const stream = await chatCompletionStream(messages, { temperature });

        for await (const chunk of stream) {
          const rawContent = chunk.choices[0]?.delta?.content;
          const content = stripThinkTags(rawContent);
          if (content) {
            yield {
              type: "content_block_delta",
              delta: { type: "text_delta", text: content },
            };
          }
        }
      } catch (error) {
        console.error("LLM streaming error:", error.message);
        throw new Error(`LLM streaming failed: ${error.message}`);
      }
    },
  };
};

// Generate code overview
export const generateCodeOverview = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 20);
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

  return await callLLM(prompt, 1000);
};

// Generate detailed code explanation
export const generateCodeExplanation = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 20);
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

  return await callLLM(prompt, 1500);
};

// Generate learning guide for the codebase
export const generateLearningGuide = async (metadata, codeSnippets) => {
  const limitedSnippets = codeSnippets.slice(0, 20);
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

  return await callLLM(prompt, 1500);
};

// Streaming codebase evolution analysis — compares two snapshots
export const streamEvolutionAnalysis = async (
  repoName,
  baseSnippets,
  headSnippets,
  compareStats,
  baseLabel,
  headLabel,
  context = {},
) => {
  const formatSnippets = (snippets) =>
    snippets
      .map((s) => {
        const contentStr =
          typeof s.content === "string" ? s.content : String(s.content);
        return `## ${s.path}\n\`\`\`\n${contentStr.substring(0, 1500)}\n\`\`\``;
      })
      .join("\n\n");

  let contextSections = "";

  if (context.changelog) {
    const cl = context.changelog;
    const sectionSummary = cl.sections
      .filter((s) => s.items.length > 0)
      .map((s) => `- ${s.title}: ${s.items.length} changes`)
      .join("\n");
    contextSections += `\n### CHANGELOG SUMMARY:\n${sectionSummary}\n`;

    if (cl.breakingChanges && cl.breakingChanges.length > 0) {
      contextSections += `\n### BREAKING CHANGES DETECTED:\n`;
      cl.breakingChanges.forEach((bc) => {
        contextSections += `- [${bc.severity}] ${bc.file}: ${bc.description}\n`;
      });
    }
  }

  if (context.contributors) {
    const contrib = context.contributors;
    const authorSummary = contrib.authors
      .slice(0, 5)
      .map(
        (a) =>
          `- ${a.name}: ${a.commits} commits (${a.percentage}%), ~+${a.additions}/-${a.deletions}`,
      )
      .join("\n");
    contextSections += `\n### CONTRIBUTOR BREAKDOWN:\n${authorSummary}\n`;
  }

  if (context.impactGraph) {
    const ig = context.impactGraph;
    contextSections += `\n### IMPACT ANALYSIS:\n- ${ig.stats.directChanges} files changed directly\n- ${ig.stats.rippleAffected} files affected downstream (ripple effect)\n- ${ig.stats.connections} dependency connections between changed files\n`;
  }

  const prompt = `Compare how the codebase of "${repoName}" evolved between two points in time.

**From:** ${baseLabel}
**To:** ${headLabel}
**Stats:** ${compareStats.totalCommits} commits, ${compareStats.filesChanged} files changed, +${compareStats.additions} additions, -${compareStats.deletions} deletions
${contextSections}
---

### CODEBASE AT "${baseLabel}":
${formatSnippets(baseSnippets)}

---

### CODEBASE AT "${headLabel}":
${formatSnippets(headSnippets)}

---

Provide a comprehensive evolution analysis with these sections:

1. **Executive Summary** — 2-3 sentence overview of the most important changes
2. **Breaking Changes** — Any breaking changes, API removals, renamed exports, deleted public files. If none detected, say "No breaking changes detected."
3. **New Features & Additions** — What was added that didn't exist before, with file references
4. **Bug Fixes & Patches** — What was fixed, referencing commit messages and files
5. **Refactoring & Improvements** — Code quality improvements, restructuring, pattern changes
6. **Architecture Impact** — How do these changes affect the overall system architecture? Note any ripple effects on downstream files.
7. **Risk Assessment** — Rate overall risk (Low/Medium/High) and explain. Consider: breaking changes, security implications, test coverage gaps, complexity increases.
8. **Recommendations** — Actionable suggestions: what to test, what to review, what to document.

Be specific, reference actual filenames, explain the "why" behind changes, and use markdown formatting with headers and bullet points.`;

  return createStream(
    `You are smar-ai, an AI-powered code analysis assistant built by rishmi5h. You provide detailed, actionable codebase evolution analysis. You identify breaking changes, assess risk, and give clear recommendations. You are powered by ${providerName}.`,
    prompt,
  );
};

// Streaming chat response for interactive Q&A
export const streamChatResponse = async (
  metadata,
  codeSnippets,
  history,
  question,
) => {
  const snippetText = codeSnippets
    .slice(0, 20)
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `\n## File: ${s.path}\n\`\`\`\n${contentStr.substring(0, 1000)}\n\`\`\``;
    })
    .join("\n");

  const systemPrompt = `You are smar-ai, an AI-powered code analysis assistant built by rishmi5h and powered by ${providerName}. You help users understand GitHub repositories. Answer questions based on the repository context provided below. Be concise, specific, and reference actual file names and code when relevant.

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

  return createStreamWithMessages(messages);
};

// Streaming architecture analysis
export const streamArchitectureAnalysis = async (
  metadata,
  codeSnippets,
  mermaidDSL,
  externalDeps,
) => {
  const snippetText = codeSnippets
    .slice(0, 8)
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `## ${s.path}\n\`\`\`\n${contentStr.substring(0, 1200)}\n\`\`\``;
    })
    .join("\n\n");

  const prompt = `Analyze the architecture of this GitHub repository.

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

Dependency Graph (Mermaid):
\`\`\`mermaid
${mermaidDSL}
\`\`\`

External Dependencies: ${externalDeps.join(", ") || "None detected"}

Code Files:
${snippetText}

Provide a clear architectural analysis:
1. **Architecture Overview** - High-level structure and patterns used
2. **Entry Points** - Where execution starts and how the app bootstraps
3. **Core Modules** - Key files/modules and what they're responsible for
4. **Data Flow** - How data moves through the application
5. **Dependencies** - Key external libraries and why they're used
6. **Design Patterns** - Notable patterns (MVC, middleware, pub-sub, etc.)

Be specific, reference actual filenames, and keep it concise.`;

  return createStream(SYSTEM_PROMPT, prompt);
};

// Streaming PR analysis
export const streamPRAnalysis = async (repoName, prDetails) => {
  const { pr, files, reviews, comments } = prDetails;

  const filesText = files
    .slice(0, 15)
    .map((f) => {
      const patch = f.patch ? f.patch.substring(0, 1500) : "No diff available";
      return `### ${f.filename} (${f.status}) +${f.additions}/-${f.deletions}\n\`\`\`diff\n${patch}\n\`\`\``;
    })
    .join("\n\n");

  const reviewsText = reviews.length > 0
    ? reviews.map((r) => `- ${r.user}: ${r.state} ${r.body ? '- ' + r.body.substring(0, 200) : ''}`).join("\n")
    : "No reviews yet";

  const prompt = `Analyze this Pull Request for the "${repoName}" repository.

**PR:** ${pr.title}
**State:** ${pr.state}${pr.merged ? ' (merged)' : ''}
**Author:** ${pr.author}
**Branch:** ${pr.head} → ${pr.base}
**Stats:** +${pr.additions} additions, -${pr.deletions} deletions, ${pr.changedFiles} files changed

**Description:**
${(pr.body || 'No description provided').substring(0, 1000)}

**Existing Reviews:**
${reviewsText}

**File Changes:**
${filesText}

Provide a thorough code review:
1. **Summary** - What this PR does in 2-3 sentences
2. **Code Quality** - Are changes well-structured and maintainable?
3. **Potential Issues** - Bugs, edge cases, or security concerns
4. **Suggestions** - Specific improvements with file/line references
5. **Test Coverage** - Are the changes adequately tested?
6. **Verdict** - Overall assessment (approve, request changes, or needs discussion)

Be specific and constructive.`;

  return createStream(
    `You are smar-ai, an AI-powered code review assistant built by rishmi5h. You analyze GitHub pull requests and provide constructive, actionable feedback. You are powered by ${providerName}.`,
    prompt,
  );
};

// Streaming Issue analysis
export const streamIssueAnalysis = async (repoName, issueDetails) => {
  const { issue, comments } = issueDetails;

  const commentsText = comments.length > 0
    ? comments
        .slice(0, 10)
        .map((c) => `**${c.user}** (${new Date(c.created_at).toLocaleDateString()}):\n${c.body.substring(0, 300)}`)
        .join("\n\n")
    : "No comments yet";

  const labelsText = issue.labels.length > 0
    ? issue.labels.join(", ")
    : "None";

  const prompt = `Analyze this GitHub Issue for the "${repoName}" repository.

**Issue:** ${issue.title}
**State:** ${issue.state}
**Author:** ${issue.author}
**Labels:** ${labelsText}
**Created:** ${new Date(issue.created_at).toLocaleDateString()}
${issue.closed_at ? `**Closed:** ${new Date(issue.closed_at).toLocaleDateString()}` : ''}

**Description:**
${(issue.body || 'No description provided').substring(0, 1500)}

**Discussion (${comments.length} comments):**
${commentsText}

Provide a comprehensive analysis:
1. **Summary** - What this issue is about in 2-3 sentences
2. **Root Cause** - If it's a bug, what's likely causing it
3. **Suggested Approach** - How to fix or implement this
4. **Complexity Estimate** - Low/Medium/High with reasoning
5. **Related Concerns** - Other areas that might be affected
6. **Priority Assessment** - How urgent this appears to be

Be concise and actionable.`;

  return createStream(
    `You are smar-ai, an AI-powered code analysis assistant built by rishmi5h. You analyze GitHub issues and help developers understand and resolve them. You are powered by ${providerName}.`,
    prompt,
  );
};

// Streaming README generation
export const streamReadmeGeneration = async (metadata, codeSnippets) => {
  const snippetText = codeSnippets
    .slice(0, 10)
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `## ${s.path}\n\`\`\`\n${contentStr.substring(0, 1500)}\n\`\`\``;
    })
    .join("\n\n");

  const fileList = codeSnippets.map((s) => s.path).join("\n");

  const prompt = `Generate a professional, comprehensive README.md for this GitHub repository.

Repository: ${metadata.name}
Owner: ${metadata.owner}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}
Stars: ${metadata.stars || 0}
Topics: ${(metadata.topics || []).join(", ") || "None"}

Project files:
${fileList}

Code samples:
${snippetText}

Generate a complete README.md with proper markdown formatting. Include:

1. **Project Title** — Name with a concise tagline
2. **Overview** — What the project does, who it's for, and why it exists (2-3 sentences)
3. **Features** — Key capabilities as a bullet list
4. **Tech Stack** — Technologies and frameworks used
5. **Getting Started** — Prerequisites, installation steps, and environment setup (infer from package.json, config files, etc.)
6. **Usage** — How to run the project and basic usage examples
7. **Project Structure** — Brief explanation of the main directories and files
8. **Contributing** — How to contribute (standard open-source guidelines)
9. **License** — Placeholder for license

Make it clean, professional, and ready to use. Use shields.io badge placeholders where appropriate. Output ONLY the raw markdown content, no extra commentary.`;

  return createStream(
    `You are smar-ai, an AI-powered README generator built by rishmi5h. You create professional, well-structured README.md files for GitHub repositories based on their code and metadata. Output only raw markdown. You are powered by ${providerName}.`,
    prompt,
  );
};

// Streaming prompt generation — generates copy-pasteable prompts for LLMs
export const streamPromptGeneration = async (
  metadata,
  codeSnippets,
  fileTree,
  graph,
  mermaidDSL,
  promptType,
  userInput,
) => {
  const snippetText = codeSnippets
    .slice(0, 10)
    .map((s) => {
      const contentStr =
        typeof s.content === "string" ? s.content : String(s.content);
      return `## ${s.path}\n\`\`\`\n${contentStr.substring(0, 1200)}\n\`\`\``;
    })
    .join("\n\n");

  const treeText = fileTree
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .slice(0, 100)
    .join("\n");

  const graphInfo =
    graph && graph.nodes
      ? `\nDependency Graph: ${graph.nodes.length} files, ${graph.edges.length} dependencies\nExternal Packages: ${(graph.externalDeps || []).join(", ") || "None"}\n\nEdges:\n${(graph.edges || []).map((e) => `  ${e.from} -> ${e.to}`).join("\n")}`
      : "";

  const mermaidBlock = mermaidDSL
    ? `\nArchitecture Diagram:\n\`\`\`mermaid\n${mermaidDSL}\n\`\`\``
    : "";

  let systemPrompt = "";
  let userPrompt = "";

  if (promptType === "recreate") {
    systemPrompt =
      "You are a prompt engineering expert. Your task: analyze a codebase and produce a PROMPT that a developer can copy-paste into any LLM (Claude, ChatGPT, Cursor, Copilot) to recreate the same project from scratch. Output ONLY the prompt text itself. Make it complete, self-contained, and actionable. Use markdown formatting within the prompt. Be extremely specific about file structure, tech stack, implementation patterns, and build order.";

    userPrompt = `Analyze this repository and generate a comprehensive "recreate this project" prompt.

Repository: ${metadata.name}
Owner: ${metadata.owner}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}
Topics: ${(metadata.topics || []).join(", ") || "None"}

File Tree:
${treeText}
${graphInfo}
${mermaidBlock}

Code Samples:
${snippetText}

Generate a prompt that includes:
1. Project title and purpose
2. Complete tech stack with specific packages
3. Directory structure to create
4. Step-by-step build order (what to implement first, second, etc.)
5. Key implementation details for each major file/module (reference actual patterns from the code)
6. Data flow description
7. External dependencies and what each is used for
8. Configuration and environment setup
9. Any important design patterns or conventions to follow

The prompt should be detailed enough that an LLM can produce working code without seeing the original repository.`;
  } else if (promptType === "feature") {
    systemPrompt =
      "You are a prompt engineering expert. Your task: analyze a codebase's conventions and patterns, then produce a PROMPT that tells an LLM how to add a specific feature following those conventions. Output ONLY the prompt text. The prompt should specify exact file names, naming patterns, existing utilities to reuse, and step-by-step wiring instructions.";

    userPrompt = `Analyze this repository's conventions and generate a prompt for adding this feature: "${userInput}"

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

File Tree:
${treeText}

Code Samples (showing existing patterns):
${snippetText}

Generate a prompt that includes:
1. Which new files to create (following the existing naming conventions)
2. Which existing files to modify
3. What existing patterns, utilities, or components to reuse
4. Step-by-step implementation plan
5. How to wire the new feature into the existing codebase (routes, imports, UI integration)
6. Any state management or data flow considerations
7. Suggested testing approach

The prompt should make the LLM produce code that looks like it was written by the same developer who built the original project.`;
  } else if (promptType === "review") {
    systemPrompt =
      "You are a prompt engineering expert. Your task: analyze a codebase and generate a PROMPT optimized for getting a thorough, actionable code review from any LLM. Output ONLY the prompt text. Include project context so the reviewing LLM understands what it's looking at, and specific focus areas derived from the actual code patterns.";

    userPrompt = `Analyze this repository and generate a code review prompt.

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

File Tree:
${treeText}

Code Samples:
${snippetText}

Generate a code review prompt that includes:
1. Project description and context for the reviewer
2. The tech stack and architectural approach
3. Specific areas to focus the review on (derived from patterns you see in the code)
4. Checklist of what to evaluate: error handling, security vulnerabilities, performance bottlenecks, code duplication, naming consistency, testing gaps, dependency concerns
5. Questions for the reviewer to answer about architecture decisions
6. Format instructions for the review output (severity levels, actionable suggestions)

The prompt should produce a review that is genuinely useful, not generic boilerplate.`;
  } else if (promptType === "migrate") {
    systemPrompt =
      "You are a prompt engineering expert specializing in code migrations. Your task: analyze a codebase and generate a PROMPT that guides an LLM through converting it to a different tech stack. Output ONLY the prompt text. Include current-to-target pattern mapping, file-by-file strategy, and migration-specific gotchas.";

    userPrompt = `Analyze this repository and generate a migration prompt to convert it to: "${userInput}"

Repository: ${metadata.name}
Language: ${metadata.language || "Unknown"}
Description: ${metadata.description || "No description"}

File Tree:
${treeText}
${graphInfo}
${mermaidBlock}

Code Samples:
${snippetText}

Generate a migration prompt that includes:
1. Current architecture summary (what exists now)
2. Target architecture (what it should look like after migration)
3. Pattern mapping: current pattern → equivalent in target
4. File-by-file migration strategy (which files change, which are new, which are deleted)
5. Dependency replacements (current package → target equivalent)
6. Configuration changes needed
7. Known gotchas and breaking changes for this specific migration
8. Suggested migration order (what to migrate first for least breakage)
9. Testing strategy to verify the migration works

The prompt should produce a complete, working migration — not just a theoretical plan.`;
  }

  return createStream(systemPrompt, userPrompt);
};

// Streaming security analysis — accepts pre-built prompts from securityPromptBuilder
export const streamSecurityAnalysis = async (systemPrompt, userPrompt) => {
  return createStream(systemPrompt, userPrompt, 0.3);
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

  return createStream(SYSTEM_PROMPT, prompt);
};
