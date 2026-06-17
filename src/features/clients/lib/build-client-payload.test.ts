import { describe, expect, it } from "vitest";

import { fromDollars } from "@app/shared/types/money";

import { buildClientPayload } from "./build-client-payload";

describe("buildClientPayload", () => {
  it("converts a defined defaultRate from dollars to cents", () => {
    const result = buildClientPayload({
      name: "Acme",
      email: "billing@acme.com",
      defaultRate: 125.5,
    });

    expect(result).toEqual({
      name: "Acme",
      email: "billing@acme.com",
      defaultRate: fromDollars(125.5),
    });
  });

  it("passes through name and email unchanged", () => {
    const result = buildClientPayload({
      name: "  Spaced Name  ",
      email: "user+tag@example.com",
      defaultRate: 10,
    });

    expect(result.name).toBe("  Spaced Name  ");
    expect(result.email).toBe("user+tag@example.com");
  });

  describe("defaultRate falsy handling", () => {
    it("returns undefined when defaultRate is undefined", () => {
      const result = buildClientPayload({
        name: "Acme",
        email: "billing@acme.com",
        defaultRate: undefined,
      });

      expect(result.defaultRate).toBeUndefined();
    });

    it("returns undefined when defaultRate is 0", () => {
      const result = buildClientPayload({
        name: "Acme",
        email: "billing@acme.com",
        defaultRate: 0,
      });

      expect(result.defaultRate).toBeUndefined();
    });

    it("returns undefined when defaultRate is NaN", () => {
      const result = buildClientPayload({
        name: "Acme",
        email: "billing@acme.com",
        defaultRate: Number.NaN,
      });

      expect(result.defaultRate).toBeUndefined();
    });

    it("returns undefined when defaultRate key is omitted", () => {
      const result = buildClientPayload({
        name: "Acme",
        email: "billing@acme.com",
      });

      expect(result.defaultRate).toBeUndefined();
    });
  });

  it("converts small fractional rates correctly", () => {
    const result = buildClientPayload({
      name: "Acme",
      email: "billing@acme.com",
      defaultRate: 0.01,
    });

    expect(result.defaultRate).toBe(fromDollars(0.01));
  });
});
