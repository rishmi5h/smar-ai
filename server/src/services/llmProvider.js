// LLM Provider — builds a chain of providers for fallback support.
// Primary provider from LLM_PROVIDER + GROQ_MODEL/OLLAMA_MODEL env vars.
// Fallback chain from LLM_FALLBACK_CHAIN env var (comma-separated "provider:model" pairs).

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Groq from "groq-sdk";
import OpenAI from "openai";

function createClient(providerType, model) {
  if (providerType === "ollama") {
    const baseURL = process.env.OLLAMA_API_URL || "http://localhost:11434/v1";
    return {
      client: new OpenAI({
        apiKey: "ollama",
        baseURL,
        timeout: 300000,
      }),
      model,
      name: "Ollama",
    };
  } else {
    // groq
    return {
      client: new Groq({
        apiKey: process.env.GROQ_API_KEY,
      }),
      model,
      name: "Groq",
    };
  }
}

// Build the provider chain
const providers = [];

// 1. Primary provider
const LLM_PROVIDER =
  process.env.LLM_PROVIDER ||
  (process.env.NODE_ENV === "production" ? "groq" : "ollama");

const primaryModel =
  LLM_PROVIDER === "ollama"
    ? process.env.OLLAMA_MODEL || "deepseek-r1:latest"
    : process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const primary = createClient(LLM_PROVIDER, primaryModel);
providers.push(primary);

console.log(`🤖 LLM Provider: ${primary.name} (${primary.model})`);

// 2. Fallback chain from env (e.g., "groq:llama-3.1-8b-instant,ollama:qwen3-coder:30b")
const fallbackChain = process.env.LLM_FALLBACK_CHAIN;
if (fallbackChain) {
  for (const entry of fallbackChain.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    // Format: "provider:model" (e.g., "groq:llama-3.1-8b-instant")
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const providerType = trimmed.substring(0, colonIdx);
    const model = trimmed.substring(colonIdx + 1);
    if (!providerType || !model) continue;

    const fallback = createClient(providerType, model);
    providers.push(fallback);
    console.log(`  ↳ Fallback: ${fallback.name} (${fallback.model})`);
  }
}

// Legacy exports for backwards compatibility
const client = primary.client;
const model = primary.model;
const providerName = primary.name;

function getActiveProviderName() {
  return primary.name;
}

export { client, model, providerName, providers, getActiveProviderName };
