import { afterEach, describe, expect, it, vi } from "vitest";

import { cookieStorageManager } from "./cookie-storage-manager";

const COOKIE_KEY = "getpaid-theme";
const DEFAULT_VALUE = "system";

function withMockedDocument(initialCookie: string, isSecure: boolean): { read: () => string } {
  let cookieStore = initialCookie;

  vi.stubGlobal("document", {
    get cookie(): string {
      return cookieStore;
    },
    set cookie(value: string) {
      cookieStore = value;
    },
  });

  vi.stubGlobal("window", {
    location: { protocol: isSecure ? "https:" : "http:" },
  });

  return { read: (): string => cookieStore };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cookieStorageManager", () => {
  describe("get", () => {
    it("returns the cookie value when present and valid", () => {
      withMockedDocument("getpaid-theme=dark", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      expect(manager.get(DEFAULT_VALUE)).toBe("dark");
    });

    it("returns the default value when the cookie is absent", () => {
      withMockedDocument("other=1", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      expect(manager.get(DEFAULT_VALUE)).toBe(DEFAULT_VALUE);
    });

    it("returns 'system' when the cookie value is 'system'", () => {
      withMockedDocument("getpaid-theme=system", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      expect(manager.get(DEFAULT_VALUE)).toBe("system");
    });

    it("returns the default value when the cookie value is invalid", () => {
      withMockedDocument("getpaid-theme=blue", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      expect(manager.get(DEFAULT_VALUE)).toBe(DEFAULT_VALUE);
    });

    it("returns the default value when document is not defined", () => {
      const manager = cookieStorageManager({ key: COOKIE_KEY });

      expect(manager.get(DEFAULT_VALUE)).toBe(DEFAULT_VALUE);
    });
  });

  describe("set", () => {
    it("writes a cookie with the value over http without secure flag", () => {
      const cookies = withMockedDocument("", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      manager.set("dark");

      expect(cookies.read()).toContain("getpaid-theme=dark");
      expect(cookies.read()).toContain("path=/");
      expect(cookies.read()).toContain("samesite=lax");
      expect(cookies.read()).not.toContain("secure");
    });

    it("writes a cookie with the secure flag over https", () => {
      const cookies = withMockedDocument("", true);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      manager.set("light");

      expect(cookies.read()).toContain("getpaid-theme=light");
      expect(cookies.read()).toContain("secure");
    });

    it("ignores invalid mode values", () => {
      const cookies = withMockedDocument("", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      manager.set("nonsense");

      expect(cookies.read()).toBe("");
    });

    it("persists 'system' so MUI's setMode('system') is honored", () => {
      const cookies = withMockedDocument("", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      manager.set("system");

      expect(cookies.read()).toContain("getpaid-theme=system");
    });

    it("is a no-op when document is not defined", () => {
      const manager = cookieStorageManager({ key: COOKIE_KEY });

      expect(() => manager.set("dark")).not.toThrow();
    });
  });

  describe("round-trip", () => {
    it("preserves the value through set then get", () => {
      withMockedDocument("", false);

      const manager = cookieStorageManager({ key: COOKIE_KEY });

      manager.set("dark");

      expect(manager.get(DEFAULT_VALUE)).toBe("dark");
    });
  });

  describe("subscribe", () => {
    it("returns a no-op unsubscribe function", () => {
      const manager = cookieStorageManager({ key: COOKIE_KEY });

      const unsubscribe = manager.subscribe(() => {});

      expect(typeof unsubscribe).toBe("function");
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
