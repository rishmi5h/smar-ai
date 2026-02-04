import Anthropic from '@anthropic-ai/sdk';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

let client;
if (!DEMO_MODE) {
  client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
}

// Mock overview response
const getMockOverview = (metadata) => {
  return `# ${metadata.name} Repository Analysis

## Project Purpose
${metadata.description || 'This is a well-structured project'}. This project demonstrates clear organization and best practices.

## Tech Stack
- Primary Language: ${metadata.language || 'JavaScript'}
- Main Frameworks: React, Express.js
- Build Tool: Vite, Webpack
- Testing: Jest, Mocha, Vitest
- Package Manager: npm or yarn

## Architecture Overview
The project follows modular architecture with clear separation of concerns.

## Key Components
1. Core Module - Handles main functionality
2. Service Layer - Manages API calls
3. UI Components - Renders interface
4. State Management - Manages application state
5. Utilities - Helper functions

## Entry Points
- Main Entry: src/main.js or src/index.js
- Server Entry: server.js or app.js
- Build: vite.config.js or webpack.config.js

## Dependencies
- React/Vue: UI framework
- Express.js: Backend framework
- Axios: HTTP client
- dotenv: Environment variables
- Nodemon: Auto-restart development`;
};

// Mock detailed response
const getMockDetailed = (metadata) => {
  return `# Detailed Code Analysis: ${metadata.name}

## File Structure Explanation

### Core Files
src/index.js - Application entry point
src/components/ - React components
src/services/ - Business logic layer

## Data Flow
User Input -> Component -> Service -> API -> Response -> State Update -> Re-render

## Key Algorithms & Patterns

### Design Patterns
- MVC Pattern: Model-View-Controller separation
- Singleton Pattern: Single instance services
- Observer Pattern: Event listeners
- Factory Pattern: Dynamic object creation

### Performance Optimizations
- Code splitting for faster loading
- Lazy loading of routes
- Memoization of computations
- Virtual scrolling for large lists

## Configuration & Setup

### Environment Variables
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development

### Installation
npm install
npm run dev

## Potential Improvements

1. Add TypeScript for type safety
2. Implement comprehensive testing
3. Add error boundaries
4. Optimize bundle size
5. Add better logging
6. Implement caching strategy`;
};

// Mock learning guide
const getMockLearning = (metadata) => {
  return `# Learning Guide: Understanding ${metadata.name}

## Prerequisites

Before diving in, be familiar with:
- JavaScript ES6+ syntax
- React Hooks (useState, useEffect)
- REST APIs and HTTP
- Node.js basics
- npm or yarn

## Learning Path

### Phase 1: Setup & Structure (2-3 hours)
- Clone repository
- Install dependencies
- Read README
- Explore directory structure
- Identify entry points

### Phase 2: Core Concepts (3-4 hours)
- Understand component structure
- Study state management
- Learn about service layer
- Explore API integration
- Study authentication

### Phase 3: Advanced Topics (4-5 hours)
- Performance optimization
- Testing approach
- Deployment setup
- Advanced patterns
- Production code

## Core Concepts to Understand

### React Components
Components accept props and return JSX.

### State Management
Use hooks to manage component state.

### API Integration
Fetch data with error handling.

## Hands-on Activities

### Activity 1: Read & Understand
- Pick any component file
- Read the entire file
- Write comments
- Trace data flow

### Activity 2: Modify & Extend
- Make simple UI changes
- Add state variables
- Update behavior
- Test changes

### Activity 3: Create New Feature
- Identify area to enhance
- Plan implementation
- Write code
- Test thoroughly

## Common Pitfalls

1. Infinite loops in useEffect
2. Stale closures in callbacks
3. Memory leaks in effects
4. Over-optimization
5. Missing error handling
6. Tight coupling between components
7. Global state abuse

## Resources & Next Steps

### Documentation
- React: https://react.dev
- Node.js: https://nodejs.org/docs
- Express: https://expressjs.com

### Learning Resources
- MDN Web Docs
- Egghead.io tutorials
- Frontend Masters courses

### Practice Projects
- Build a todo app
- Create weather dashboard
- Make a blog platform
- Build chat application

## Final Tips

1. Start small
2. Read good code
3. Write often
4. Ask questions
5. Debug effectively
6. Take breaks`;
};

// Generate code overview
export const generateCodeOverview = async (metadata, codeSnippets) => {
  if (DEMO_MODE) {
    return getMockOverview(metadata);
  }

  const snippetText = codeSnippets
    .map(s => `\n## File: ${s.path}\n\`\`\`\n${s.content}\n\`\`\``)
    .join('\n');

  const prompt = `You are an expert code analyst. Analyze this GitHub repository and provide a comprehensive overview.

Repository: ${metadata.name}
Language: ${metadata.language || 'Unknown'}
Description: ${metadata.description || 'No description'}

Code samples:
${snippetText}

Please provide:
1. Project Purpose
2. Tech Stack
3. Architecture Overview
4. Key Components
5. Entry Points
6. Dependencies`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text;
};

// Generate detailed explanation
export const generateCodeExplanation = async (metadata, codeSnippets) => {
  if (DEMO_MODE) {
    return getMockDetailed(metadata);
  }

  const snippetText = codeSnippets
    .map(s => `\n## File: ${s.path}\n\`\`\`\n${s.content}\n\`\`\``)
    .join('\n');

  const prompt = `Provide detailed explanation of this codebase:

Repository: ${metadata.name}
Language: ${metadata.language || 'Unknown'}

Code files:
${snippetText}

Explain:
1. File Structure
2. Data Flow
3. Key Algorithms
4. Functions Breakdown
5. Configuration
6. Improvements`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text;
};

// Generate learning guide
export const generateLearningGuide = async (metadata, codeSnippets) => {
  if (DEMO_MODE) {
    return getMockLearning(metadata);
  }

  const snippetText = codeSnippets
    .map(s => `\n## File: ${s.path}\n\`\`\`\n${s.content}\n\`\`\``)
    .join('\n');

  const prompt = `Create learning guide for this codebase:

Repository: ${metadata.name}
Language: ${metadata.language || 'Unknown'}

Code samples:
${snippetText}

Create a guide with:
1. Prerequisites
2. Learning Path
3. Core Concepts
4. Hands-on Activities
5. Common Pitfalls
6. Resources`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text;
};

// Streaming version
export const streamCodeAnalysis = async (metadata, codeSnippets, analysisType = 'overview') => {
  if (DEMO_MODE) {
    let text = '';
    if (analysisType === 'overview') {
      text = getMockOverview(metadata);
    } else if (analysisType === 'detailed') {
      text = getMockDetailed(metadata);
    } else {
      text = getMockLearning(metadata);
    }

    // Create async generator for demo streaming
    return {
      [Symbol.asyncIterator]: async function* () {
        const chunks = text.match(/.{1,100}/g) || [text];
        for (const chunk of chunks) {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: chunk }
          };
        }
      }
    };
  }

  const snippetText = codeSnippets
    .map(s => `\n## File: ${s.path}\n\`\`\`\n${s.content}\n\`\`\``)
    .join('\n');

  let prompt = `Analyze this repository: ${metadata.name}\n${snippetText}`;

  return client.messages.stream({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
};
