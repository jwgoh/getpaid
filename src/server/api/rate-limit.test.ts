import { NextResponse } from "next/server";

import { describe, expect, it, vi } from "vitest";

vi.mock("@app/server/api/route-helpers", () => ({
  errorResponse: (code: string, message: string, status: number) =>
    NextResponse.json({ error: { code, message } }, { status }),
}));

vi.mock("@app/shared/config/env", () => ({
  env: { TRUSTED_PROXY_HOPS: 1 },
}));

const { resolveClientIp } = await import("./rate-limit");

function makeRequest(headers: Record<string, string>): Request {
  return new Request("https://example.com/", { headers });
}

describe("resolveClientIp", () => {
  describe("with X-Forwarded-For present", () => {
    it("returns the only entry when one proxy hop is trusted", () => {
      const request = makeRequest({ "x-forwarded-for": "203.0.113.7" });

      expect(resolveClientIp(request, 1)).toBe("203.0.113.7");
    });

    it("returns the last entry when one proxy appends after a spoofed prefix", () => {
      const request = makeRequest({
        "x-forwarded-for": "1.2.3.4, 203.0.113.7",
      });

      expect(resolveClientIp(request, 1)).toBe("203.0.113.7");
    });

    it("ignores attacker-controlled prefix entries", () => {
      const spoof = "203.0.113.99";
      const real = "198.51.100.42";
      const request = makeRequest({
        "x-forwarded-for": `${spoof}, ${real}`,
      });

      expect(resolveClientIp(request, 1)).toBe(real);
      expect(resolveClientIp(request, 1)).not.toBe(spoof);
    });

    it("returns the (length - hops) entry for multiple trusted hops", () => {
      const request = makeRequest({
        "x-forwarded-for": "spoof, client-ip, cloudflare-ip",
      });

      expect(resolveClientIp(request, 2)).toBe("client-ip");
    });

    it("returns 'unknown' when hops exceeds available entries (mis-config / no proxy)", () => {
      const request = makeRequest({ "x-forwarded-for": "1.2.3.4" });

      expect(resolveClientIp(request, 2)).toBe("unknown");
    });

    it("returns 'unknown' when hops is 0 (header is fully untrusted)", () => {
      const request = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });

      expect(resolveClientIp(request, 0)).toBe("unknown");
    });

    it("trims whitespace around entries", () => {
      const request = makeRequest({
        "x-forwarded-for": "  1.2.3.4  ,   203.0.113.7  ",
      });

      expect(resolveClientIp(request, 1)).toBe("203.0.113.7");
    });

    it("skips empty segments produced by stray commas", () => {
      const request = makeRequest({
        "x-forwarded-for": "1.2.3.4,,203.0.113.7",
      });

      expect(resolveClientIp(request, 1)).toBe("203.0.113.7");
    });

    it("does not let attacker land in a fresh bucket per spoofed header", () => {
      const real = "198.51.100.42";
      const first = makeRequest({
        "x-forwarded-for": `${"a".repeat(8)}, ${real}`,
      });
      const second = makeRequest({
        "x-forwarded-for": `${"b".repeat(8)}, ${real}`,
      });
      const third = makeRequest({
        "x-forwarded-for": `${"c".repeat(8)}, ${real}`,
      });

      expect(resolveClientIp(first, 1)).toBe(real);
      expect(resolveClientIp(second, 1)).toBe(real);
      expect(resolveClientIp(third, 1)).toBe(real);
    });
  });

  describe("with X-Forwarded-For absent", () => {
    it("falls back to x-real-ip when set", () => {
      const request = makeRequest({ "x-real-ip": "203.0.113.55" });

      expect(resolveClientIp(request, 1)).toBe("203.0.113.55");
    });

    it("returns 'unknown' when no usable header is present", () => {
      const request = makeRequest({});

      expect(resolveClientIp(request, 1)).toBe("unknown");
    });

    it("falls back to x-real-ip even when hops is 0", () => {
      const request = makeRequest({ "x-real-ip": "203.0.113.55" });

      expect(resolveClientIp(request, 0)).toBe("203.0.113.55");
    });
  });
});
