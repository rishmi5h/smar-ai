// LLM Fallback Chain — tries providers in order until one succeeds.
// Handles timeouts, rate limits, auth errors, and server errors.

import { providers, getActiveProviderName } from "./llmProvider.js";

// Errors that should NOT trigger fallback (bad input, not provider issue)
const isClientError = (err) => err.status === 400 || err.status === 422;

// Errors that should permanently disable a provider for this session
const isAuthError = (err) => err.status === 401 || err.status === 403;

/**
 * Non-streaming LLM call with fallback.
 * Tries each provider in the chain until one succeeds.
 */
export async function chatCompletion(messages, options = {}) {
  const errors = [];

  for (const provider of providers) {
    if (provider.disabled) continue;

    try {
      const result = await provider.client.chat.completions.create({
        messages,
        model: provider.model,
        ...options,
      });
      // Log which provider was used (only if it wasn't the first one)
      if (errors.length > 0) {
        console.log(`[LLM Fallback] Succeeded with ${provider.name} (${provider.model})`);
      }
      return result;
    } catch (err) {
      if (isClientError(err)) {
        // Bad request — don't fallback, it'll fail everywhere
        throw err;
      }
      if (isAuthError(err)) {
        provider.disabled = true;
        console.warn(`[LLM Fallback] ${provider.name} auth failed — disabled for this session`);
      } else {
        console.warn(`[LLM Fallback] ${provider.name} (${provider.model}) failed: ${err.message}`);
      }
      errors.push({ provider: provider.name, model: provider.model, error: err.message });
    }
  }

  const summary = errors.map((e) => `${e.provider}/${e.model}: ${e.error}`).join("; ");
  throw new Error(`All LLM providers failed. ${summary}`);
}

/**
 * Streaming LLM call with fallback.
 * Returns an async iterable of chunks from the first successful provider.
 */
export async function chatCompletionStream(messages, options = {}) {
  const errors = [];

  for (const provider of providers) {
    if (provider.disabled) continue;

    try {
      const stream = await provider.client.chat.completions.create({
        messages,
        model: provider.model,
        stream: true,
        ...options,
      });
      if (errors.length > 0) {
        console.log(`[LLM Fallback] Streaming with ${provider.name} (${provider.model})`);
      }
      return stream;
    } catch (err) {
      if (isClientError(err)) {
        throw err;
      }
      if (isAuthError(err)) {
        provider.disabled = true;
        console.warn(`[LLM Fallback] ${provider.name} auth failed — disabled for this session`);
      } else {
        console.warn(`[LLM Fallback] ${provider.name} (${provider.model}) stream failed: ${err.message}`);
      }
      errors.push({ provider: provider.name, model: provider.model, error: err.message });
    }
  }

  const summary = errors.map((e) => `${e.provider}/${e.model}: ${e.error}`).join("; ");
  throw new Error(`All LLM providers failed for streaming. ${summary}`);
}
