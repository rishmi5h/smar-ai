// LLM Provider — switches between Groq (cloud) and Ollama (local) based on env var
// Groq SDK v0.37+ uses /openai/v1/ paths which are incompatible with Ollama,
// so we use the OpenAI SDK for Ollama and Groq SDK for Groq.

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Groq from "groq-sdk";
import OpenAI from "openai";

const LLM_PROVIDER =
  process.env.LLM_PROVIDER ||
  (process.env.NODE_ENV === "production" ? "groq" : "ollama");

let client;
let model;
let providerName;

if (LLM_PROVIDER === "ollama") {
  const baseURL = process.env.OLLAMA_API_URL || "http://localhost:11434/v1";
  client = new OpenAI({
    apiKey: "ollama", // Ollama doesn't need a real key but the SDK requires one
    baseURL: baseURL,
    timeout: 300000, // 5 min timeout — local inference is slower
  });
  model = process.env.OLLAMA_MODEL || "deepseek-r1:latest";
  providerName = "Ollama";
  console.log(`🤖 LLM Provider: Ollama (${model}) at ${baseURL}`);
} else {
  client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  providerName = "Groq";
  console.log(`🤖 LLM Provider: Groq (${model})`);
}

export { client, model, providerName };
