import { describe, expect, it } from "vitest";

import { extractDbHost } from "./extract-db-host";

describe("extractDbHost", () => {
  it("returns 'unset' when url is undefined", () => {
    expect(extractDbHost(undefined)).toBe("unset");
  });

  it("returns 'unset' when url is an empty string", () => {
    expect(extractDbHost("")).toBe("unset");
  });

  it("returns 'invalid' for an unparseable url", () => {
    expect(extractDbHost("not a url")).toBe("invalid");
  });

  it("returns the hostname for a valid postgres url", () => {
    expect(extractDbHost("postgresql://user:pass@db.neon.tech:5432/getpaid")).toBe("db.neon.tech");
  });

  it("returns the hostname for a localhost url without credentials", () => {
    expect(extractDbHost("postgresql://localhost:5432/test")).toBe("localhost");
  });

  it("never includes the password in its output", () => {
    const result = extractDbHost("postgresql://user:supersecret@db.example.com:5432/db");

    expect(result).not.toContain("supersecret");
    expect(result).not.toContain("user");
    expect(result).toBe("db.example.com");
  });
});
