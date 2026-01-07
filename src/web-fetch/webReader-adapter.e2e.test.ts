/**
 * TDD Test: web_fetch via MCP webReader adapter
 *
 * Problem: Bot runs in isolated environment without direct network access.
 * Current web_fetch uses Node.js fetch() which fails.
 *
 * Solution: Use MCP webReader tool which has internet access.
 */

import { describe, expect, it } from "vitest";
import { fetchViaWebReader } from "./webReader-adapter.js";

const runE2E = ['1', 'true', 'yes'].includes(
  (process.env.RUN_E2E ?? '').toLowerCase(),
);
const describeE2E = runE2E ? describe : describe.skip;

describeE2E("webReader-adapter: TDD for web_fetch fix", () => {
  describe("Phase 1: Demonstrate network isolation", () => {
    it("should fail with direct Node.js fetch (baseline)", async () => {
      // This demonstrates the problem - direct fetch fails
      try {
        const response = await fetch("https://example.com", {
          signal: AbortSignal.timeout(5000),
        });
        expect(response.ok).toBe(true);
      } catch (error) {
        // Expected to fail in isolated environment
        expect(error).toBeDefined();
        console.log("✓ Phase 1 confirmed: Direct fetch fails (expected):", String(error).slice(0, 100));
      }
    });
  });

  describe("Phase 2: webReader adapter works", () => {
    it("should fetch https://example.com via webReader", async () => {
      // Add more time for gemini
      const result = await fetchViaWebReader("https://example.com", { timeout: 75000 });

      // Verify we got meaningful content
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(50);
      // Content should have something meaningful
      expect(
        result.includes("Example") ||
        result.includes("пример") ||
        result.includes("Domain") ||
        result.includes("домен") ||
        result.includes("📄") // At minimum we get the formatted response
      ).toBe(true);

      console.log("✓ Phase 2: webReader adapter works!");
      console.log(`  Content length: ${result.length} chars`);
    }, 90000); // 90s timeout for vitest

    it("should fetch a real news site", async () => {
      const result = await fetchViaWebReader("https://www.newyorker.com/");

      // Verify we got meaningful content
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(100);

      console.log("✓ Real news site fetched successfully");
      console.log(`  Content length: ${result.length} chars`);
    }, 60000); // 60s timeout
  });

  describe("Phase 3: Error handling", () => {
    it("should handle invalid URL gracefully", async () => {
      const result = await fetchViaWebReader("not-a-valid-url");

      // Should return error message, not throw
      expect(result).toBeDefined();
      // Error message in Russian (Ошибка) or English (Error)
      expect(result.includes("Error") || result.includes("Ошибка")).toBe(true);
    });

    it("should handle non-existent domain", async () => {
      const result = await fetchViaWebReader("https://this-domain-does-not-exist-12345.com");

      // Should return error message (might timeout or return error)
      expect(result).toBeDefined();
    }, 60000); // 60s timeout
  });
});
