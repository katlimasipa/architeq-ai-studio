export const PENDING_PROJECT_PROMPT_KEY = "architeq.pendingProjectPrompt";

export function suggestProjectName(prompt: string) {
  const firstSentence = prompt.trim().replace(/\s+/g, " ").split(/[.!?]/, 1)[0] ?? "";
  const withoutCommand = firstSentence.replace(
    /^(?:please\s+)?(?:build|create|design|make|generate)\s+(?:me\s+)?(?:a|an|the)?\s*/i,
    "",
  );
  const name = (withoutCommand || firstSentence)
    .split(" ")
    .slice(0, 7)
    .join(" ")
    .replace(/\s+(?:and|or|for|to|with|of|in|on)$/i, "")
    .replace(/[,.!?;:]+$/, "");

  return name ? `${name[0].toUpperCase()}${name.slice(1)}`.slice(0, 100).trim() : "Untitled project";
}
