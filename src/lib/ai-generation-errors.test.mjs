import { describe, expect, test } from "bun:test";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { getEmptyGenerationMessage, getProviderErrorMessage } from "./ai-generation-errors.ts";

function mockOpenAIModel(fetchResponse) {
  const provider = createOpenAICompatible({
    name: "test-provider",
    baseURL: "https://example.test/v1",
    apiKey: "test-key",
    fetch: async () => fetchResponse(),
  });
  return provider("google/gemini-3.8-flash");
}

describe("AI generation provider errors", () => {
  test("explains the Vercel AI Gateway card requirement and free Gemini alternative", () => {
    const message = getProviderErrorMessage({
      statusCode: 403,
      message: "AI Gateway requires a valid credit card on file to service requests.",
    }, true);

    expect(message).toContain("payment card on file");
    expect(message).toContain("GEMINI_API_KEY");
  });

  test("keeps rate limit errors actionable", () => {
    expect(getProviderErrorMessage({ statusCode: 429 }, true)).toBe("Rate limit reached. Try again in a moment.");
  });

  test("explains when the configured model is unavailable", () => {
    expect(getProviderErrorMessage({ statusCode: 404, message: "Not Found" }, false))
      .toContain("isn’t available to this API key");
  });

  test("does not expose gateway-specific setup advice for other providers", () => {
    expect(getProviderErrorMessage({ statusCode: 403, message: "Forbidden" }, false))
      .toContain("provider rejected the request");
  });

  test("explains why content-filtered output is empty", () => {
    expect(getEmptyGenerationMessage("content-filter")).toContain("blocked this request");
  });

  test("explains when a model stops without returning content", () => {
    expect(getEmptyGenerationMessage("stop")).toContain("returned no site content");
  });

  test("returns HTML from the AI SDK provider response", async () => {
    const model = mockOpenAIModel(() => new Response(JSON.stringify({
      id: "mock",
      object: "chat.completion",
      created: 1,
      model: "mock",
      choices: [{
        index: 0,
        message: { role: "assistant", content: "<!DOCTYPE html><html><body>Preview</body></html>" },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 1, completion_tokens: 8, total_tokens: 9 },
    }), {
      headers: { "content-type": "application/json" },
    }));

    const result = await generateText({
      model,
      system: "Return a complete HTML page.",
      messages: [{ role: "user", content: "Build a preview" }],
    });

    expect(result.text).toContain("<!DOCTYPE html>");
    expect(result.text).toContain("Preview");
    expect(result.finishReason).toBe("stop");
  });

  test("preserves the real provider error for clear billing guidance", async () => {
    const model = mockOpenAIModel(() => new Response(JSON.stringify({
      error: {
        message: "AI Gateway requires a valid credit card on file to service requests.",
        type: "customer_verification_required",
      },
    }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }));
    const error = await generateText({
      model,
      messages: [{ role: "user", content: "Build a preview" }],
    }).catch((cause) => cause);

    expect(error).toMatchObject({ statusCode: 403 });
    expect(getProviderErrorMessage(error, true)).toContain("GEMINI_API_KEY");
  });
});
