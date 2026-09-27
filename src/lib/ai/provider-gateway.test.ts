import { describe, expect, it, vi } from "vitest";
import { createAiProvider, readProviderConfig } from "./provider-gateway.server";

function response(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

const config = {
  kind: "openai-compatible" as const,
  baseUrl: "https://example.test/v1",
  apiKey: "secret",
  model: "forge-model",
  timeoutMs: 1_000,
  maxRetries: 2,
  temperature: 0.2,
};

describe("V40 production AI provider gateway", () => {
  it("normalizes a provider response and usage metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(
        {
          choices: [{ message: { content: "hello" } }],
          usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        },
        { headers: { "x-request-id": "req-1" } },
      ),
    );
    const result = await createAiProvider(config, fetchMock).complete({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("hello");
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 4, totalTokens: 14 });
    expect(result.requestId).toBe("req-1");
    expect(result.attempts).toBe(1);
  });

  it("keeps API keys out of request payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ choices: [{ message: { content: "ok" } }] }));
    await createAiProvider(config, fetchMock).complete({
      messages: [{ role: "user", content: "hello" }],
    });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(init.body)).not.toContain("secret");
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer secret");
  });

  it("retries transient HTTP failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ error: "busy" }, { status: 503 }))
      .mockResolvedValueOnce(response({ choices: [{ message: { content: "recovered" } }] }));
    const result = await createAiProvider(config, fetchMock).complete({ messages: [] });
    expect(result.content).toBe("recovered");
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry malformed successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ choices: [] }));
    await expect(createAiProvider(config, fetchMock).complete({ messages: [] })).rejects.toThrow(
      "empty response",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-transient client errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ error: "bad request" }, { status: 400 }));
    await expect(createAiProvider(config, fetchMock).complete({ messages: [] })).rejects.toThrow(
      "HTTP 400",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads bounded production configuration from environment", () => {
    const result = readProviderConfig({
      FORGE_AI_API_KEY: "key",
      FORGE_AI_MODEL: "model",
      FORGE_AI_BASE_URL: "https://provider.example/v1/",
      FORGE_AI_TIMEOUT_MS: "45000",
      FORGE_AI_MAX_RETRIES: "4",
      FORGE_AI_TEMPERATURE: "0.7",
    });
    expect(result).toMatchObject({
      baseUrl: "https://provider.example/v1",
      timeoutMs: 45_000,
      maxRetries: 4,
      temperature: 0.7,
    });
  });

  it("rejects insecure non-local provider endpoints", () => {
    expect(() =>
      readProviderConfig({
        FORGE_AI_API_KEY: "key",
        FORGE_AI_MODEL: "model",
        FORGE_AI_BASE_URL: "http://provider.example/v1",
      }),
    ).toThrow("HTTPS");
  });
});
