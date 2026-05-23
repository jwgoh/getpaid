import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, ApiResponseShapeError, fetchApi } from "./base";

const URL = "/api/test";

function mockFetchResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): void {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      return new Response(JSON.stringify(body), { status });
    })
  );
}

describe("fetchApi", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the parsed JSON body when no schema is supplied", async () => {
    mockFetchResponse({ id: "abc", name: "x" });
    const result = await fetchApi<{ id: string; name: string }>(URL);

    expect(result).toEqual({ id: "abc", name: "x" });
  });

  it("validates and returns schema-shaped data when a schema is supplied", async () => {
    const schema = z.object({ id: z.string(), count: z.number() });

    mockFetchResponse({ id: "abc", count: 3, extra: "ignored" });

    const result = await fetchApi(URL, undefined, schema);

    expect(result).toEqual({ id: "abc", count: 3 });
  });

  it("throws ApiResponseShapeError and logs when the response does not match the schema", async () => {
    const schema = z.object({ id: z.string(), count: z.number() });

    mockFetchResponse({ id: "abc", count: "three" });

    await expect(fetchApi(URL, undefined, schema)).rejects.toBeInstanceOf(ApiResponseShapeError);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("throws ApiError on a non-OK response and never runs the schema parser", async () => {
    const schema = z.object({ id: z.string() });
    const parseSpy = vi.spyOn(schema, "safeParse");

    mockFetchResponse(
      { error: { code: "BAD_REQUEST", message: "nope" } },
      { ok: false, status: 400 }
    );

    await expect(fetchApi(URL, undefined, schema)).rejects.toBeInstanceOf(ApiError);
    expect(parseSpy).not.toHaveBeenCalled();
  });
});
