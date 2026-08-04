export type ViolationCategory =
  | "SYSTEM_PROMPT_EXTRACTION"
  | "SECRET_REQUEST"
  | "CONFIDENTIAL_CLIENT_REQUEST"
  | "PROMPT_INJECTION"
  | "OUT_OF_SCOPE";

export interface GuardrailResult {
  safe: boolean;
  violation?: ViolationCategory;
}

interface PatternSet {
  category: ViolationCategory;
  patterns: RegExp[];
}

/**
 * Pattern sets for detecting various types of unsafe input.
 * All patterns are case-insensitive and designed to catch clear violations.
 * More specific patterns (like prompt injection) are checked before broader ones.
 */
const VIOLATION_PATTERNS: PatternSet[] = [
  {
    category: "PROMPT_INJECTION",
    patterns: [
      /ignore\s+(all\s+)?(previous|prior|earlier)\s+instructions/i,
      /ignore\s+(everything|all)\s+(above|before)/i,
      /new\s+(role|instruction|command)/i,
      /you\s+are\s+now\s+(a\s+)?(pirate|dan|admin|developer|assistant|chatbot|system)/i,
      /act\s+as\s+(if\s+)?you\s+are/i,
      /\bdan\b.*no\s+restrictions/i,
      /forget\s+(your\s+)?(previous\s+)?instructions/i,
      /override\s+(your\s+)?programming/i,
    ],
  },
  {
    category: "SYSTEM_PROMPT_EXTRACTION",
    patterns: [
      /(show|reveal|display|print|give)\s+(me\s+)?(your\s+)?system\s+prompt/i,
      /what\s+(is\s+)?(your\s+)?system\s+prompt/i,
      /show\s+(me\s+)?(your\s+)?instructions/i,
      /reveal\s+(your\s+)?(instructions|rules|prompt)/i,
      /what\s+(is|are)\s+your\s+rules(\s+you\s+follow)?/i,
      /display\s+(your\s+)?prompt/i,
      /print\s+(your\s+)?(system\s+)?instructions/i,
    ],
  },
  {
    category: "SECRET_REQUEST",
    patterns: [
      /\bapi\s+key\b/i,
      /\bpassword(s)?\b/i,
      /\bcredential(s)?\b/i,
      /\bsecret(s)?\b/i,
      /\btoken(s)?\b/i,
      /\bauth(entication)?\s+key/i,
      /show\s+(me\s+)?(your\s+)?key/i,
      /give\s+(me\s+)?(your\s+)?(password|credential|secret|key)/i,
    ],
  },
  {
    category: "CONFIDENTIAL_CLIENT_REQUEST",
    patterns: [
      /\bclient\s+list\b/i,
      /list\s+(all\s+)?(your\s+)?clients/i,
      /customer\s+(data|revenue|information)/i,
      /confidential\s+(client|customer)/i,
      /give\s+(me\s+)?confidential/i,
      /show\s+(me\s+)?client\s+data/i,
      /revenue\s+data/i,
    ],
  },
  {
    category: "OUT_OF_SCOPE",
    patterns: [
      /write\s+(code|program|script)/i,
      /implement\s+(a\s+)?(sorting|algorithm|function)/i,
      /do\s+my\s+(homework|assignment)/i,
      /solve\s+my\s+homework/i,
      /write\s+(a\s+)?(poem|story|essay)/i,
      /create\s+(a\s+)?website/i,
      /build\s+(a\s+)?(app|application)/i,
    ],
  },
];

/**
 * Normalize whitespace in the input to prevent simple obfuscation attempts.
 * Converts multiple whitespace characters (spaces, tabs, newlines) to single spaces.
 */
function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/**
 * Check if the input message contains patterns that violate safety policies.
 * Returns the first detected violation or indicates the input is safe.
 */
export function checkInputGuardrails(message: string): GuardrailResult {
  const normalized = normalizeWhitespace(message);

  for (const patternSet of VIOLATION_PATTERNS) {
    for (const pattern of patternSet.patterns) {
      if (pattern.test(normalized)) {
        return {
          safe: false,
          violation: patternSet.category,
        };
      }
    }
  }

  return { safe: true };
}
