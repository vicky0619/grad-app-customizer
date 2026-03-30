export function extractFirstJsonValue(input: string): string | null {
  const source = input.trim();
  let start = -1;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{" || char === "[") {
      start = i;
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const last = stack.at(-1);
      const matches =
        (last === "{" && char === "}") ||
        (last === "[" && char === "]");

      if (!matches) {
        return null;
      }

      stack.pop();
      if (stack.length === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function parseJsonResponse<T>(input: string, context = "JSON response"): T {
  const source = input.trim();

  try {
    return JSON.parse(source) as T;
  } catch (directError) {
    const extracted = extractFirstJsonValue(source);
    if (extracted && extracted !== source) {
      try {
        return JSON.parse(extracted) as T;
      } catch {
        // Fall through to the original error below.
      }
    }

    const reason = directError instanceof Error ? directError.message : "Unknown parse error";
    throw new Error(`${context} is not valid JSON: ${reason}`);
  }
}
