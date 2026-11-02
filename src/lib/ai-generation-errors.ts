type ProviderError = {
  statusCode?: number;
  message?: string;
  responseBody?: string;
};

export function getProviderErrorMessage(error: unknown, usesVercelGateway: boolean) {
  const providerError = error as ProviderError;
  const details = `${providerError?.message ?? ""} ${providerError?.responseBody ?? ""}`;
  const statusCode = providerError?.statusCode;

  if (statusCode === 429) return "Rate limit reached. Try again in a moment.";
  if (
    usesVercelGateway &&
    (statusCode === 402 || statusCode === 403) &&
    /valid credit card|payment card|billing|credits/i.test(details)
  ) {
    return "Vercel AI Gateway requires a payment card on file. To try Google's free Gemini tier (if available to your account), add a Gemini API key as GEMINI_API_KEY in the Vercel project environment, then redeploy.";
  }
  if (statusCode === 402) return "AI credits exhausted. Add credits in workspace settings.";
  if (statusCode === 401 || statusCode === 403) {
    return "The AI provider rejected the request. Check its API key, model access, or billing setup, then retry.";
  }
  return providerError?.message || "Generation failed";
}

export function getEmptyGenerationMessage(finishReason: string, rawFinishReason?: string) {
  if (finishReason === "content-filter") {
    return "The AI provider blocked this request. Rephrase the prompt and try again.";
  }
  if (finishReason === "length") {
    return "The AI provider stopped before returning a complete site. Shorten the request and try again.";
  }

  const reason = rawFinishReason || finishReason;
  return reason && reason !== "stop" && reason !== "other"
    ? `The AI provider returned no site content (reason: ${reason}). Check the provider setup and retry.`
    : "The AI provider returned no site content. Check the provider setup and retry.";
}
