export type AiProviderKind = "openai-compatible";

export type AiProviderConfig = {
  kind: AiProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  temperature: number;
};

export type AiProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AiCompletionRequest = {
  messages: AiProviderMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type AiCompletionResult = {
  content: string;
  provider: AiProviderKind;
  model: string;
  requestId: string | null;
  usage: AiUsage | null;
  attempts: number;
  latencyMs: number;
};

type FetchLike = typeof fetch;

type OpenAiCompatiblePayload = {
  choices?: Array<{ message?: { content?: string | null } | null }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TEMPERATURE = 0.2;
const MAX_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 5;

function positiveInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function boundedTemperature(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TEMPERATURE;
  return Math.max(0, Math.min(parsed, 2));
}

export function readProviderConfig(env: NodeJS.ProcessEnv = process.env): AiProviderConfig | null {
  const apiKey = env["FORGE_AI_API_KEY"];
  const model = env["FORGE_AI_MODEL"];
  if (!apiKey || !model) return null;

  const kind = env["FORGE_AI_PROVIDER"] ?? "openai-compatible";
  if (kind !== "openai-compatible") throw new Error(`Unsupported AI provider: ${kind}`);

  const baseUrl = (env["FORGE_AI_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/$/, "");
  if (!/^https:\/\//i.test(baseUrl) && !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(baseUrl)) {
    throw new Error("FORGE_AI_BASE_URL must use HTTPS, except localhost development endpoints.");
  }

  return {
    kind,
    apiKey,
    baseUrl,
    model,
    timeoutMs: positiveInteger(env["FORGE_AI_TIMEOUT_MS"], DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS),
    maxRetries: positiveInteger(env["FORGE_AI_MAX_RETRIES"], DEFAULT_MAX_RETRIES, MAX_RETRIES),
    temperature: boundedTemperature(env["FORGE_AI_TEMPERATURE"]),
  };
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function retryDelayMs(attempt: number): number {
  return Math.min(250 * 2 ** attempt, 4_000);
}

function abortAfter(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function parseUsage(usage: OpenAiCompatiblePayload["usage"]): AiUsage | null {
  if (!usage) return null;
  const promptTokens = Number(usage.prompt_tokens ?? 0);
  const completionTokens = Number(usage.completion_tokens ?? 0);
  const totalTokens = Number(usage.total_tokens ?? promptTokens + completionTokens);
  if (![promptTokens, completionTokens, totalTokens].every(Number.isFinite)) return null;
  return { promptTokens, completionTokens, totalTokens };
}

export function createAiProvider(config: AiProviderConfig, fetchImpl: FetchLike = fetch) {
  return {
    async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
      const started = Date.now();
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
        const timeout = abortAfter(config.timeoutMs);
        try {
          const body: Record<string, unknown> = {
            model: config.model,
            messages: request.messages,
            temperature: request.temperature ?? config.temperature,
          };
          if (request.maxTokens !== undefined) body["max_tokens"] = request.maxTokens;

          const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: timeout.signal,
          });

          if (!response.ok) {
            const error = new Error(`AI provider returned HTTP ${response.status}`);
            if (!retryableStatus(response.status) || attempt >= config.maxRetries) throw error;
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
            continue;
          }

          const payload = (await response.json()) as OpenAiCompatiblePayload;
          const content = payload.choices?.[0]?.message?.content;
          if (typeof content !== "string" || !content.trim()) {
            throw new Error("AI provider returned an empty response.");
          }

          return {
            content,
            provider: config.kind,
            model: config.model,
            requestId: response.headers.get("x-request-id"),
            usage: parseUsage(payload.usage),
            attempts: attempt + 1,
            latencyMs: Date.now() - started,
          };
        } catch (error) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          lastError =
            normalized.name === "AbortError"
              ? new Error(`AI provider request timed out after ${config.timeoutMs}ms`)
              : normalized;
          if (attempt >= config.maxRetries) throw lastError;
          if (
            normalized.name !== "AbortError" &&
            !/HTTP (408|409|425|429|5\d\d)$/.test(normalized.message)
          ) {
            throw lastError;
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
        } finally {
          timeout.cancel();
        }
      }

      throw lastError ?? new Error("AI provider request failed.");
    },
  };
}

export async function completeAiRequest(
  request: AiCompletionRequest,
  config = readProviderConfig(),
): Promise<AiCompletionResult> {
  if (!config) {
    throw new Error("AI provider is not configured. Set FORGE_AI_API_KEY and FORGE_AI_MODEL.");
  }
  return createAiProvider(config).complete(request);
}
