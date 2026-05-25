import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VALID_KEY = randomBytes(32).toString("base64");

const timeTrackingConnection = {
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@app/server/db", () => ({
  prisma: { timeTrackingConnection },
}));

const mockProvider = {
  getWorkspaces: vi.fn(),
  getProjects: vi.fn(),
  getTimeEntries: vi.fn(),
  validateToken: vi.fn(),
};

vi.mock("./providers", async () => {
  const actual = await vi.importActual<typeof import("./providers")>("./providers");

  return {
    ...actual,
    getProvider: () => mockProvider,
  };
});

async function loadService() {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
  vi.stubEnv("NEXTAUTH_SECRET", randomBytes(32).toString("base64"));
  vi.stubEnv("ENCRYPTION_KEY", VALID_KEY);

  const service = await import("./service");
  const encryption = await import("./encryption");

  return { ...service, encryption };
}

const USER_ID = "user-1" as never;
const PROVIDER_ID = "toggl";
const CONNECTION_ID = "conn-1";
const CORRUPT_CIPHERTEXT = Buffer.from("garbage-bytes-not-valid-aes-gcm-payload").toString(
  "base64"
);

beforeEach(() => {
  timeTrackingConnection.findUnique.mockReset();
  timeTrackingConnection.update.mockReset();
  timeTrackingConnection.delete.mockReset();
  mockProvider.getWorkspaces.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getWorkspaces — decrypt flow", () => {
  it("returns workspaces and bumps lastUsedAt on a valid token", async () => {
    const { getWorkspaces, encryption } = await loadService();
    const ciphertext = encryption.encrypt("toggl-token");

    timeTrackingConnection.findUnique.mockResolvedValue({
      id: CONNECTION_ID,
      userId: USER_ID,
      provider: PROVIDER_ID,
      encryptedToken: ciphertext,
    });
    timeTrackingConnection.update.mockResolvedValue({});
    mockProvider.getWorkspaces.mockResolvedValue(["ws-1"]);

    const result = await getWorkspaces(USER_ID, PROVIDER_ID);

    expect(result).toEqual(["ws-1"]);
    expect(timeTrackingConnection.update).toHaveBeenCalledWith({
      where: { id: CONNECTION_ID },
      data: { lastUsedAt: expect.any(Date) },
    });
    expect(timeTrackingConnection.delete).not.toHaveBeenCalled();
    expect(mockProvider.getWorkspaces).toHaveBeenCalledWith("toggl-token", undefined);
  });

  it("wipes the row and throws ConnectionDecryptError when ciphertext is undecryptable", async () => {
    const { getWorkspaces, ConnectionDecryptError } = await loadService();

    timeTrackingConnection.findUnique.mockResolvedValue({
      id: CONNECTION_ID,
      userId: USER_ID,
      provider: PROVIDER_ID,
      encryptedToken: CORRUPT_CIPHERTEXT,
    });
    timeTrackingConnection.delete.mockResolvedValue({});

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getWorkspaces(USER_ID, PROVIDER_ID)).rejects.toBeInstanceOf(
      ConnectionDecryptError
    );

    expect(timeTrackingConnection.delete).toHaveBeenCalledWith({ where: { id: CONNECTION_ID } });
    expect(timeTrackingConnection.update).not.toHaveBeenCalled();
    expect(mockProvider.getWorkspaces).not.toHaveBeenCalled();

    const loggedLine = errorSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(loggedLine);

    expect(parsed.event).toBe("time_tracking.token.decrypt_failed");
    expect(parsed.userId).toBe(USER_ID);
    expect(parsed.provider).toBe(PROVIDER_ID);
    expect(parsed.connectionId).toBe(CONNECTION_ID);

    errorSpy.mockRestore();
  });

  it("still throws ConnectionDecryptError even if the DELETE cleanup itself fails", async () => {
    const { getWorkspaces, ConnectionDecryptError } = await loadService();

    timeTrackingConnection.findUnique.mockResolvedValue({
      id: CONNECTION_ID,
      userId: USER_ID,
      provider: PROVIDER_ID,
      encryptedToken: CORRUPT_CIPHERTEXT,
    });
    timeTrackingConnection.delete.mockRejectedValue(new Error("db is down"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getWorkspaces(USER_ID, PROVIDER_ID)).rejects.toBeInstanceOf(
      ConnectionDecryptError
    );

    expect(timeTrackingConnection.delete).toHaveBeenCalled();

    const wipeFailLine = errorSpy.mock.calls.find((call) =>
      String(call[0]).includes("time_tracking.token.wipe_failed")
    );

    expect(wipeFailLine).toBeDefined();

    errorSpy.mockRestore();
  });

  it("throws ConnectionNotFoundError without touching UPDATE/DELETE when no row exists", async () => {
    const { getWorkspaces, ConnectionNotFoundError } = await loadService();

    timeTrackingConnection.findUnique.mockResolvedValue(null);

    await expect(getWorkspaces(USER_ID, PROVIDER_ID)).rejects.toBeInstanceOf(
      ConnectionNotFoundError
    );
    expect(timeTrackingConnection.update).not.toHaveBeenCalled();
    expect(timeTrackingConnection.delete).not.toHaveBeenCalled();
    expect(mockProvider.getWorkspaces).not.toHaveBeenCalled();
  });
});
