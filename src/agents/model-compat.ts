import type { Api, Model } from "@mariozechner/pi-ai";

function isOpenAiCompletionsModel(model: Model<Api>): model is Model<"openai-completions"> {
  return model.api === "openai-completions";
}

/**
 * Check if a model supports tools based on its compat.supportedParameters.
 *
 * Logic:
 * - If compat.supportedParameters is undefined/null, assume tools are supported
 *   (backward compatible with cloud providers that don't need explicit declaration)
 * - If compat.supportedParameters is defined but empty [], tools are NOT supported
 * - If compat.supportedParameters includes "tools", tools ARE supported
 *
 * This allows local models (sglang, vLLM, etc.) to explicitly declare tool support.
 */
export function modelSupportsTools(model: Model<Api>): boolean {
  const debugLog = process.env.CLAWDBOT_DEBUG_TOOLS === "1";
  if (debugLog) {
    console.error(`[modelSupportsTools] model.id=${model.id} model.api=${model.api}`);
    console.error(`[modelSupportsTools] model.compat=${JSON.stringify(model.compat)}`);
  }

  if (!isOpenAiCompletionsModel(model)) {
    if (debugLog) {
      console.error(`[modelSupportsTools] Not OpenAI API, returning true`);
    }
    return true;
  }

  const compat = model.compat;
  if (!compat) {
    if (debugLog) {
      console.error(`[modelSupportsTools] No compat, returning true`);
    }
    return true;
  }

  const supportedParams = (compat as Record<string, unknown>).supportedParameters as
    | string[]
    | undefined;
  if (debugLog) {
    console.error(`[modelSupportsTools] supportedParams=${JSON.stringify(supportedParams)}`);
  }

  if (supportedParams === undefined || supportedParams === null) {
    if (debugLog) {
      console.error(`[modelSupportsTools] supportedParams undefined/null, returning true`);
    }
    return true;
  }

  const result = Array.isArray(supportedParams) && supportedParams.includes("tools");
  if (debugLog) {
    console.error(`[modelSupportsTools] Final result: ${result}`);
  }
  return result;
}

export function normalizeModelCompat(model: Model<Api>): Model<Api> {
  const baseUrl = model.baseUrl ?? "";
  const isZai = model.provider === "zai" || baseUrl.includes("api.z.ai");
  if (!isZai || !isOpenAiCompletionsModel(model)) {
    return model;
  }

  const compat = model.compat ?? undefined;
  if (compat?.supportsDeveloperRole === false) {
    return model;
  }

  return {
    ...model,
    compat: compat ? { ...compat, supportsDeveloperRole: false } : { supportsDeveloperRole: false },
  };
}
