import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import SafeActionLink from "./SafeActionLink";

describe("SafeActionLink Component", () => {
  beforeEach(() => {
    // Mock console.error to suppress defensive check warnings in tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Approved URLs", () => {
    it("renders link with approved strategy call URL", () => {
      const html = renderToString(
        <SafeActionLink label="Book a strategy call" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain("https://www.cadreai.com/contact");
      expect(html).toContain("Book a strategy call");
      expect(html).toContain("↗"); // External indicator
    });

    it("renders link with approved portal URL", () => {
      const html = renderToString(
        <SafeActionLink label="Access client portal" url="https://send.reignmakerapp.com/login" />
      );

      expect(html).toContain("https://send.reignmakerapp.com/login");
      expect(html).toContain("Access client portal");
      expect(html).toContain("↗");
    });

    it("renders link with correct href attribute", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain('href="https://www.cadreai.com/contact"');
    });

    it("renders link with target=\"_blank\" for new tab", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain('target="_blank"');
    });

    it("renders link with rel=\"noopener noreferrer\" for security", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("renders link with accessible aria-label", () => {
      const html = renderToString(
        <SafeActionLink label="Book a strategy call" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain('aria-label="Book a strategy call - opens in new tab"');
    });

    it("renders link with action-link CSS class", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain('class="action-link"');
    });

    it("renders external link indicator in text", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain("Test");
      expect(html).toContain("↗");
    });
  });

  describe("Non-approved URLs", () => {
    it("does not render link with non-approved URL", () => {
      const html = renderToString(
        <SafeActionLink label="Malicious link" url="https://evil.com/phishing" />
      );

      // Should render nothing (empty string or no link)
      expect(html).not.toContain("https://evil.com");
      expect(html).not.toContain("Malicious link");
      expect(html).not.toContain("<a");
    });

    it("logs error when non-approved URL is provided", () => {
      const consoleErrorSpy = vi.spyOn(console, "error");

      renderToString(
        <SafeActionLink label="Test" url="https://evil.com" />
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SafeActionLink: URL not in allowlist")
      );
    });

    it("does not render link for empty URL", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="" />
      );

      expect(html).not.toContain("<a");
    });

    it("does not render link for URL with extra path segments not in allowlist", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact/extra" />
      );

      // Exact matching - this URL is not in the allowlist
      expect(html).not.toContain("<a");
    });
  });

  describe("Defensive validation", () => {
    it("validates URL even when called with approved URL", () => {
      // This test ensures isApprovedLink is called
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact" />
      );

      // Should render because it passes validation
      expect(html).toContain("<a");
    });

    it("returns null for non-approved URL (defensive check)", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://notapproved.com" />
      );

      expect(html).toBe("");
    });
  });

  describe("Accessibility", () => {
    it("includes aria-label with context about new tab", () => {
      const html = renderToString(
        <SafeActionLink label="Access portal" url="https://send.reignmakerapp.com/login" />
      );

      expect(html).toContain('aria-label="Access portal - opens in new tab"');
    });

    it("uses semantic <a> element for screen reader compatibility", () => {
      const html = renderToString(
        <SafeActionLink label="Test" url="https://www.cadreai.com/contact" />
      );

      expect(html).toMatch(/<a\s[^>]*>/);
    });
  });

  describe("Visual indicator", () => {
    it("includes external link arrow indicator", () => {
      const html = renderToString(
        <SafeActionLink label="Book call" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain("↗");
    });

    it("places indicator after label text", () => {
      const html = renderToString(
        <SafeActionLink label="Click here" url="https://www.cadreai.com/contact" />
      );

      expect(html).toContain("Click here");
      expect(html).toContain("↗");
      // Verify arrow comes after label (may have HTML comment markers in between)
      const labelIndex = html.indexOf("Click here");
      const arrowIndex = html.indexOf("↗");
      expect(arrowIndex).toBeGreaterThan(labelIndex);
    });
  });
});
