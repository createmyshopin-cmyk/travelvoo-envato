import { describe, it, expect } from "vitest";

interface KeywordRule {
  match: string | string[];
  match_type: "contains" | "whole_word" | "exact";
  case_sensitive: boolean;
  action: string;
  channel?: string;
  enabled: boolean;
}

function evaluateKeywordRules(text: string, rules: KeywordRule[], channel = "dm"): string | null {
  const normalized = text.toLowerCase().trim();

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.channel && rule.channel !== channel) continue;

    const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
    const hit = matches.some((m) => {
      const needle = (rule.case_sensitive ? m : m.toLowerCase()).trim();
      const haystack = rule.case_sensitive ? text.trim() : normalized;
      if (rule.match_type === "exact") return haystack === needle;
      if (rule.match_type === "whole_word") {
        return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, rule.case_sensitive ? "" : "i").test(text);
      }
      return haystack.includes(needle);
    });

    if (hit) return rule.action;
  }

  return null;
}

describe("keyword matcher", () => {
  const rules: KeywordRule[] = [
    { match: "price", match_type: "contains", case_sensitive: false, action: "template_reply", enabled: true },
    { match: "book", match_type: "whole_word", case_sensitive: false, action: "ai_reply", enabled: true },
    { match: "STOP", match_type: "exact", case_sensitive: true, action: "suppress", enabled: true },
    { match: "disabled", match_type: "contains", case_sensitive: false, action: "template_reply", enabled: false },
    { match: "comment-only", match_type: "contains", case_sensitive: false, action: "ai_reply", channel: "comment", enabled: true },
  ];

  it("matches 'contains' rule", () => {
    expect(evaluateKeywordRules("What is the price?", rules)).toBe("template_reply");
  });

  it("matches 'whole_word' rule", () => {
    expect(evaluateKeywordRules("I want to book a trip", rules)).toBe("ai_reply");
  });

  it("does not match partial word for whole_word", () => {
    expect(evaluateKeywordRules("facebook post", rules)).toBeNull();
  });

  it("matches exact case-sensitive", () => {
    expect(evaluateKeywordRules("STOP", rules)).toBe("suppress");
  });

  it("does not match exact with wrong case", () => {
    expect(evaluateKeywordRules("stop", rules)).toBeNull();
  });

  it("skips disabled rules", () => {
    expect(evaluateKeywordRules("disabled keyword", rules)).toBeNull();
  });

  it("respects channel filter", () => {
    expect(evaluateKeywordRules("comment-only keyword", rules, "dm")).toBeNull();
    expect(evaluateKeywordRules("comment-only keyword", rules, "comment")).toBe("ai_reply");
  });

  it("returns null when no rules match", () => {
    expect(evaluateKeywordRules("hello there", rules)).toBeNull();
  });
});
