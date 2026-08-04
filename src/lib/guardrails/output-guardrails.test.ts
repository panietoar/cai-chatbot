import { describe, it, expect } from "vitest";
import {
  checkOutputGuardrails,
  SAFE_FALLBACK_MESSAGE,
} from "./output-guardrails";

describe("Output Guardrails — P4-S3", () => {
  // ============================================================================
  // Happy Path Tests (valid responses pass validation)
  // ============================================================================

  describe("happy path: valid responses", () => {
    it("should pass a simple valid response with no URLs, pricing, or banned phrases", () => {
      const text = "Cadre helps organizations develop comprehensive AI strategies.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should pass a response mentioning legitimate Cadre capabilities", () => {
      const text =
        "Cadre helps with AI implementation strategy, governance frameworks, and technology selection.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should pass a valid response with an approved URL", () => {
      const text =
        "You can book a strategy call to discuss your needs. Visit https://www.cadreai.com/contact for more details.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should pass a response with multiple approved content elements", () => {
      const text =
        "Cadre specializes in AI strategy and governance. We help with technology selection and implementation planning. Cadre serves industries including financial services, healthcare, and technology.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });

    it("should pass a response with numbers that are not pricing (e.g., years, counts)", () => {
      const text =
        "Cadre was founded in 2020 and has worked with 50 organizations across multiple industries.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });
  });

  // ============================================================================
  // URL Validation Tests
  // ============================================================================

  describe("URL validation", () => {
    it("should block a response with a non-approved URL", () => {
      const text =
        "Visit https://unapproved-site.com/page for more information about Cadre.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_url");
      expect(result.originalText).toBe(text);
    });

    it("should block a response with multiple URLs, one non-approved", () => {
      const text =
        "For more info, visit https://example.com/placeholder-strategy-call or https://evil.com/phishing.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_url");
    });

    it("should pass a response with only approved URLs", () => {
      const text =
        "Book a call at https://www.cadreai.com/contact and learn more.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });

    it("should block a URL-like pattern that is an actual URL", () => {
      const text =
        "Check out https://wikipedia.org/wiki/AI for general information.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_url");
    });

    it("should pass a text mentioning domain-like words that are not actual URLs", () => {
      const text =
        "Many companies use example.com as a placeholder in documentation.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });

    it("should detect URLs with http (not just https)", () => {
      const text = "Visit http://untrusted-site.com for details.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_url");
    });
  });

  // ============================================================================
  // Pricing Detection Tests
  // ============================================================================

  describe("pricing detection", () => {
    it("should block a response with a dollar amount like $10,000", () => {
      const text =
        "Our implementation package costs $10,000 for enterprise clients.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_pricing");
    });

    it("should block a response with a euro amount like €500", () => {
      const text = "This service is priced at €500 per month in Europe.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_pricing");
    });

    it("should block a response with a pound amount like £1000", () => {
      const text = "UK customers pay £1000 for this offering.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_pricing");
    });

    it("should block a response with a yen amount like ¥50000", () => {
      const text = "Japanese pricing is ¥50000 per quarter.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_pricing");
    });

    it("should block text with 'cost is $X' pattern", () => {
      const text =
        "The basic plan costs is $5,000 for implementation and setup.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_pricing");
    });

    it("should block text with 'price: $X' pattern", () => {
      const text = "Our base price: $2,500 includes initial consultation.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("contains_pricing");
    });

    it("should pass a response mentioning numbers without currency symbols", () => {
      const text =
        "We have served 1000 organizations across 50 different industries.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });

    it("should pass a response with currency words but no amounts", () => {
      const text =
        "Pricing varies by region and is customized for each client's needs.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });
  });

  // ============================================================================
  // Unsupported Capability Detection Tests
  // ============================================================================

  describe("unsupported capability detection", () => {
    it("should block text claiming 'access the portal'", () => {
      const text =
        "You can access the portal to view your project status in real-time.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should block text claiming 'book a live meeting'", () => {
      const text = "Book a live meeting with our team to review your AI roadmap.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should block text claiming 'schedule a call'", () => {
      const text = "Schedule a call with Cadre at your convenience.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should block text claiming CRM integration", () => {
      const text = "Cadre can integrate with Salesforce to sync your data.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should block text claiming 'authenticate'", () => {
      const text = "Authenticate with your company credentials to access the system.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should block text claiming 'login'", () => {
      const text = "Login to your account to manage your AI projects.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should block text claiming 'real-time handoff'", () => {
      const text = "Our team enables real-time handoff to human specialists.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should block text claiming HubSpot integration", () => {
      const text = "Integrate with HubSpot to manage your CRM data automatically.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should pass text that mentions Cadre capabilities that ARE supported", () => {
      const text =
        "Cadre provides AI strategy, implementation guidance, and technology selection services.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });

    it("should be case-insensitive when detecting banned phrases", () => {
      const text = "ACCESS THE PORTAL to view your dashboard.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should be case-insensitive for mixed-case banned phrases", () => {
      const text = "Access The Portal is available to all users.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });

    it("should detect 'access your portal' variant", () => {
      const text = "Access your portal to review project details.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("unsupported_capability");
    });
  });

  // ============================================================================
  // Internal Detail Leak Tests
  // ============================================================================

  describe("internal detail leak detection", () => {
    it("should block text mentioning 'schema v1'", () => {
      const text =
        "Based on schema v1 of our knowledge base, here is the information.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("internal_detail_leak");
    });

    it("should block text mentioning 'knowledge ID'", () => {
      const text = "The information from knowledge ID xyz-123 confirms this.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("internal_detail_leak");
    });

    it("should block text mentioning 'retrieved from'", () => {
      const text = "Retrieved from our internal database, this information shows...";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("internal_detail_leak");
    });

    it("should block text mentioning 'guardrail'", () => {
      const text =
        "This response passed guardrail checks before being returned to you.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("internal_detail_leak");
    });

    it("should block text mentioning 'fallback message'", () => {
      const text = "This is the fallback message shown when data is unavailable.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("internal_detail_leak");
    });

    it("should be case-insensitive when detecting internal leaks", () => {
      const text = "This data was RETRIEVED FROM our internal systems.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("internal_detail_leak");
    });
  });

  // ============================================================================
  // Malformed and Edge Case Tests
  // ============================================================================

  describe("malformed and edge cases", () => {
    it("should reject an empty string", () => {
      const text = "";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("malformed");
    });

    it("should reject a null value", () => {
      const result = checkOutputGuardrails(null);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("malformed");
    });

    it("should reject an undefined value", () => {
      const result = checkOutputGuardrails(undefined);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("malformed");
    });

    it("should reject a whitespace-only string", () => {
      const text = "   \n\t  ";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("malformed");
    });

    it("should reject a response exceeding 5000 characters", () => {
      const text = "a".repeat(5001);
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("too_long");
      expect(result.originalText).toBe(text);
    });

    it("should accept a response at exactly 5000 characters", () => {
      const text = "a".repeat(5000);
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });

    it("should accept a response just under the length limit", () => {
      const text = "a".repeat(4999);
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
    });

    it("should reject a non-string value (number)", () => {
      const result = checkOutputGuardrails(123);
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("malformed");
    });

    it("should reject a non-string value (object)", () => {
      const result = checkOutputGuardrails({ message: "test" });
      expect(result.safe).toBe(false);
      expect(result.reason).toBe("malformed");
    });

    it("should include originalText in failure results", () => {
      const text = "Book a live meeting now!";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      expect(result.originalText).toBe(text);
    });

    it("should not include originalText when response is safe", () => {
      const text = "Cadre helps with AI strategy.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(true);
      expect(result.originalText).toBeUndefined();
    });
  });

  // ============================================================================
  // Safe Fallback Message Export Tests
  // ============================================================================

  describe("safe fallback message", () => {
    it("should export SAFE_FALLBACK_MESSAGE", () => {
      expect(SAFE_FALLBACK_MESSAGE).toBeDefined();
      expect(typeof SAFE_FALLBACK_MESSAGE).toBe("string");
      expect(SAFE_FALLBACK_MESSAGE.length).toBeGreaterThan(0);
    });

    it("safe fallback message should pass validation", () => {
      const result = checkOutputGuardrails(SAFE_FALLBACK_MESSAGE);
      expect(result.safe).toBe(true);
    });
  });

  // ============================================================================
  // Combined Violation Tests (multiple issues in one response)
  // ============================================================================

  describe("combined violations", () => {
    it("should detect the first violation when multiple are present", () => {
      const text =
        "Our pricing is $5,000 and you can access the portal at https://evil.com/phishing.";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      // Should catch URL first in processing order
      expect(
        [
          "contains_url",
          "contains_pricing",
          "unsupported_capability",
        ].includes(result.reason!)
      ).toBe(true);
    });

    it("should catch a response with oversized content and harmful claims", () => {
      const text = "a".repeat(5001) + " Access the portal now!";
      const result = checkOutputGuardrails(text);
      expect(result.safe).toBe(false);
      // Should catch length first
      expect(result.reason).toBe("too_long");
    });
  });

  // ============================================================================
  // Result Type Tests
  // ============================================================================

  describe("result type structure", () => {
    it("should return correct interface structure for passing validation", () => {
      const result = checkOutputGuardrails("Valid response.");
      expect(result).toHaveProperty("safe");
      expect(result.safe).toBe(true);
      // Optional properties should not be present when safe=true
      expect(result.reason).toBeUndefined();
      expect(result.originalText).toBeUndefined();
    });

    it("should return correct interface structure for failing validation", () => {
      const text = "Book a live meeting.";
      const result = checkOutputGuardrails(text);
      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("reason");
      expect(result).toHaveProperty("originalText");
      expect(result.safe).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.originalText).toBe(text);
    });
  });
});
