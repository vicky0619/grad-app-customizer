import { describe, expect, it } from "vitest";
import { extractFirstJsonValue, parseJsonResponse } from "./json";

describe("extractFirstJsonValue", () => {
  it("extracts a JSON object wrapped in markdown fences", () => {
    const input = '```json\n{"content":"ok","changes":[]}\n```';

    expect(extractFirstJsonValue(input)).toBe('{"content":"ok","changes":[]}');
  });

  it("extracts the first complete JSON object before trailing commentary", () => {
    const input = '{"content":"ok","changes":[{"type":"x","reason":"y"}]}\nNotes: extra text';

    expect(extractFirstJsonValue(input)).toBe('{"content":"ok","changes":[{"type":"x","reason":"y"}]}');
  });

  it("handles braces inside strings", () => {
    const input = '{"content":"Use {braces} safely","changes":[]} trailing';

    expect(parseJsonResponse<{ content: string }>(input).content).toBe("Use {braces} safely");
  });
});

describe("parseJsonResponse", () => {
  it("parses valid JSON directly", () => {
    const parsed = parseJsonResponse<{ ok: boolean }>('{"ok":true}', "test payload");

    expect(parsed).toEqual({ ok: true });
  });

  it("throws a contextual error when no JSON can be found", () => {
    expect(() => parseJsonResponse("not json", "test payload")).toThrow(
      "test payload is not valid JSON"
    );
  });
});
