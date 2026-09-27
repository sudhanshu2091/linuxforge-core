/** Shared redaction for persisted events and AI-facing terminal context. */
const SECRET_PATTERNS: Array<{ re: RegExp; field: string }> = [
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, field: "jwt" },
  { re: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}\b/g, field: "supabase-key" },
  { re: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g, field: "github-token" },
  { re: /\b(?:sk|rk)-[A-Za-z0-9_-]{20,}\b/g, field: "api-key" },
  {
    re: /\b(?:password|passwd|secret|token|api[_-]?key)\s*[=:]\s*([^\s'"`]+)/gi,
    field: "credential-assignment",
  },
  { re: /\bAuthorization:\s*Bearer\s+\S+/gi, field: "authorization" },
];

export function redactText(input: string): { text: string; redactedFields: string[] } {
  let text = input;
  const redactedFields: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    pattern.re.lastIndex = 0;
    if (pattern.re.test(text)) redactedFields.push(pattern.field);
    pattern.re.lastIndex = 0;
    text = text.replace(pattern.re, (match, value) => {
      if (pattern.field === "credential-assignment" && typeof value === "string") {
        return match.slice(0, match.length - value.length) + "[redacted]";
      }
      return "[redacted]";
    });
  }
  return { text, redactedFields: [...new Set(redactedFields)] };
}

export function redactLines<T extends { text: string }>(lines: T[]) {
  const fields = new Set<string>();
  const next = lines.map((line) => {
    const result = redactText(line.text);
    result.redactedFields.forEach((field) => fields.add(field));
    return { ...line, text: result.text };
  });
  return { lines: next, redactedFields: [...fields] };
}
