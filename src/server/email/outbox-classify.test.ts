import { describe, expect, it } from "vitest";

import { classifyResendError, extractResendError } from "./outbox-classify";

describe("classifyResendError", () => {
  it("classifies 5xx as transient", () => {
    expect(
      classifyResendError({
        statusCode: 503,
        name: "internal_server_error",
        message: "boom",
      })
    ).toBe("transient");
  });

  it("classifies 429 rate-limit as transient", () => {
    expect(
      classifyResendError({
        statusCode: 429,
        name: "rate_limit_exceeded",
        message: "slow down",
      })
    ).toBe("transient");
  });

  it("classifies 4xx (422 validation) as permanent", () => {
    expect(
      classifyResendError({
        statusCode: 422,
        name: "validation_error",
        message: "invalid recipient",
      })
    ).toBe("permanent");
  });

  it("classifies 4xx (404 not_found) as permanent", () => {
    expect(
      classifyResendError({
        statusCode: 404,
        name: "not_found",
        message: "no such resource",
      })
    ).toBe("permanent");
  });

  it("classifies a null shape (network error) as transient", () => {
    expect(classifyResendError(null)).toBe("transient");
  });

  it("treats a missing statusCode as transient", () => {
    expect(
      classifyResendError({
        statusCode: null,
        name: null,
        message: "unknown error",
      })
    ).toBe("transient");
  });

  it("respects transient name overrides even with 4xx status (rate_limit_exceeded)", () => {
    expect(
      classifyResendError({
        statusCode: 429,
        name: "rate_limit_exceeded",
        message: "slow down",
      })
    ).toBe("transient");
  });
});

describe("extractResendError", () => {
  it("extracts statusCode + name + message from Resend ErrorResponse", () => {
    const shape = extractResendError({
      statusCode: 503,
      name: "internal_server_error",
      message: "boom",
    });

    expect(shape).toEqual({
      statusCode: 503,
      name: "internal_server_error",
      message: "boom",
    });
  });

  it("returns null for a non-object input", () => {
    expect(extractResendError("oops")).toBeNull();
    expect(extractResendError(null)).toBeNull();
  });

  it("returns null when the object has no error-like fields", () => {
    expect(extractResendError({ foo: "bar" })).toBeNull();
  });

  it("tolerates partial shapes (only message)", () => {
    expect(extractResendError({ message: "boom" })).toEqual({
      statusCode: null,
      name: null,
      message: "boom",
    });
  });
});
