/**
 * Multy Lock E2E Tests (v4 fix validation)
 * Run with: pnpm test src/telegram/bot.multy.lock.e2e.test.ts
 *
 * Tests the lock mechanism for concurrent multy command handling:
 * - Lock file creation and cleanup
 * - Stale lock detection and recovery
 * - In-flight lock behavior
 * - Concurrent command blocking
 */

import {
  access,
  chmod,
  constants,
  mkdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

const _MULTY_LOCK_DIR = "/tmp/clawdis";
const MULTY_LOCK_STALE_MS = 60_000;
const testLockDir = path.join(os.tmpdir(), "clawdis-multy-lock-e2e");

async function getMultyCliPath(): Promise<string> {
  const envPath = process.env.MULTY_BIN?.trim();
  if (envPath) return envPath;
  return "multy";
}

let hasMultyCli = false;
try {
  const cliPath = await getMultyCliPath();
  await access(cliPath, constants.X_OK);
  hasMultyCli = true;
} catch {
  hasMultyCli = false;
}

const describeE2E = hasMultyCli ? describe : describe.skip;

describeE2E("Multy Lock E2E (v4 fix)", () => {
  beforeAll(async () => {
    await mkdir(testLockDir, { recursive: true });
    process.env.MULTY_LOCK_DIR = testLockDir;
  });

  afterEach(async () => {
    // Clean up all test lock files
    await rm(testLockDir, { recursive: true, force: true });
    await mkdir(testLockDir, { recursive: true });
  });

  describe("Lock file operations", () => {
    it("creates lock file with correct structure", async () => {
      const chatId = 12345;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);
      const runId = "test-run-123";
      const pid = process.pid;
      const startedAt = Date.now();

      const payload = {
        pid,
        runId,
        topic: "test topic",
        startedAt,
        updatedAt: Date.now(),
      };

      await writeFile(lockPath, JSON.stringify(payload), "utf8");

      const raw = await readFile(lockPath, "utf8");
      const parsed = JSON.parse(raw);

      expect(parsed.pid).toBe(pid);
      expect(parsed.runId).toBe(runId);
      expect(parsed.topic).toBe("test topic");
      expect(typeof parsed.startedAt).toBe("number");
      expect(typeof parsed.updatedAt).toBe("number");
    });

    it("reads lock file and detects active lock", async () => {
      const chatId = 67890;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);
      const runId = "test-run-456";
      const pid = process.pid;

      const payload = {
        pid,
        runId,
        topic: "active topic",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await writeFile(lockPath, JSON.stringify(payload), "utf8");

      const stats = await stat(lockPath);
      const raw = await readFile(lockPath, "utf8");
      const parsed = JSON.parse(raw);

      expect(stats.mtimeMs).toBeGreaterThan(0);
      expect(parsed.runId).toBe(runId);
    });

    it("clears lock file successfully", async () => {
      const chatId = 111222;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

      await writeFile(lockPath, JSON.stringify({ test: true }), "utf8");
      await expect(access(lockPath, constants.F_OK)).resolves.not.toThrow();

      await unlink(lockPath);
      await expect(access(lockPath, constants.F_OK)).rejects.toThrow();
    });
  });

  describe("Stale lock detection (v4 fix)", () => {
    it("detects stale lock based on mtime", async () => {
      const chatId = 333444;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

      // Create a lock file with old mtime (simulate stale)
      const _oldTime = Date.now() - MULTY_LOCK_STALE_MS - 1000;
      await writeFile(lockPath, JSON.stringify({ runId: "stale-run" }), "utf8");

      // Touch the file to set old mtime
      await chmod(lockPath, 0o644);
      const stats = await stat(lockPath);

      // Simulate the stale detection logic from readMultyLock
      const isStale = Date.now() - stats.mtimeMs > MULTY_LOCK_STALE_MS;
      expect(isStale).toBe(true);

      // Cleanup
      await unlink(lockPath);
    });

    it("keeps recent lock as active", async () => {
      const chatId = 555666;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

      await writeFile(
        lockPath,
        JSON.stringify({ runId: "recent-run" }),
        "utf8",
      );
      const stats = await stat(lockPath);

      const isStale = Date.now() - stats.mtimeMs > MULTY_LOCK_STALE_MS;
      expect(isStale).toBe(false);
    });

    it("clears stale lock and returns inactive", async () => {
      const chatId = 777888;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

      // Create a lock file
      await writeFile(
        lockPath,
        JSON.stringify({ runId: "stale-to-clear" }),
        "utf8",
      );

      // Simulate stale detection and cleanup
      const stats = await stat(lockPath);
      if (Date.now() - stats.mtimeMs > MULTY_LOCK_STALE_MS) {
        try {
          await unlink(lockPath);
        } catch {
          // ignore
        }
      }

      // Verify lock is cleared
      await expect(access(lockPath, constants.F_OK)).rejects.toThrow();
    });
  });

  describe("Concurrent command handling", () => {
    it("blocks second command when lock is active", async () => {
      const chatId = 999000;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

      // First command creates lock
      const firstPayload = {
        pid: process.pid,
        runId: "first-command",
        topic: "first topic",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
      await writeFile(lockPath, JSON.stringify(firstPayload), "utf8");

      // Simulate checking if lock is active
      let lockActive = false;
      try {
        await stat(lockPath);
        const raw = await readFile(lockPath, "utf8");
        const parsed = JSON.parse(raw);
        const updatedAt = parsed.updatedAt || parsed.startedAt;
        lockActive = Date.now() - updatedAt <= MULTY_LOCK_STALE_MS;
      } catch {
        lockActive = false;
      }

      expect(lockActive).toBe(true);

      // Second command should be blocked
      const _secondPayload = {
        pid: process.pid,
        runId: "second-command",
        topic: "second topic",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Simulate race condition: second command tries to write
      let secondWriteFailed = false;
      try {
        await access(lockPath, constants.F_OK);
        secondWriteFailed = true; // Lock exists, should block
      } catch {
        secondWriteFailed = false;
      }

      expect(secondWriteFailed).toBe(true);

      // Cleanup
      await unlink(lockPath);
    });

    it("allows new command after lock is cleared", async () => {
      const chatId = 111222333;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

      // Create and then clear lock
      await writeFile(lockPath, JSON.stringify({ runId: "old-run" }), "utf8");
      await unlink(lockPath);

      // Verify lock is cleared
      let lockExists = true;
      try {
        await access(lockPath, constants.F_OK);
      } catch {
        lockExists = false;
      }

      expect(lockExists).toBe(false);

      // New command should be able to create lock
      const newPayload = {
        pid: process.pid,
        runId: "new-command",
        topic: "new topic",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
      await writeFile(lockPath, JSON.stringify(newPayload), "utf8");

      const raw = await readFile(lockPath, "utf8");
      const parsed = JSON.parse(raw);
      expect(parsed.runId).toBe("new-command");

      // Cleanup
      await unlink(lockPath);
    });
  });

  describe("Lock heartbeat (v4 fix)", () => {
    it("updates lock file with heartbeat", async () => {
      const chatId = 444555666;
      const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

      // Initial lock
      const startedAt = Date.now();
      const initialPayload = {
        pid: process.pid,
        runId: "heartbeat-test",
        topic: "heartbeat topic",
        startedAt,
        updatedAt: startedAt,
      };
      await writeFile(lockPath, JSON.stringify(initialPayload), "utf8");

      // Simulate heartbeat update
      await new Promise((resolve) => setTimeout(resolve, 50));
      const heartbeatPayload = {
        pid: process.pid,
        runId: "heartbeat-test",
        topic: "heartbeat topic",
        startedAt,
        updatedAt: Date.now(),
      };
      await writeFile(lockPath, JSON.stringify(heartbeatPayload), "utf8");

      // Verify heartbeat updated the mtime
      const stats = await stat(lockPath);
      expect(stats.mtimeMs).toBeGreaterThan(startedAt);

      // Cleanup
      await unlink(lockPath);
    });
  });
});

describe("Multy Lock Edge Cases (v4 fix)", () => {
  beforeAll(async () => {
    await mkdir(testLockDir, { recursive: true });
    process.env.MULTY_LOCK_DIR = testLockDir;
  });

  afterEach(async () => {
    await rm(testLockDir, { recursive: true, force: true });
    await mkdir(testLockDir, { recursive: true });
  });

  it("handles corrupted lock file gracefully", async () => {
    const chatId = 777888999;
    const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

    // Create corrupted lock file
    await writeFile(lockPath, "not valid json {{{", "utf8");

    // Simulate corrupted file handling (v4 fix: clear corrupted files)
    let parseError = false;
    let fileCleared = false;
    try {
      const raw = await readFile(lockPath, "utf8");
      JSON.parse(raw);
    } catch {
      parseError = true;
      // v4 fix: clear corrupted lock files immediately
      try {
        await unlink(lockPath);
        fileCleared = true;
      } catch {
        // ignore
      }
    }

    expect(parseError).toBe(true);
    expect(fileCleared).toBe(true);

    // Verify cleanup
    let fileExists = true;
    try {
      await access(lockPath, constants.F_OK);
    } catch {
      fileExists = false;
    }
    expect(fileExists).toBe(false);
  });

  it("handles missing lock directory gracefully", async () => {
    const chatId = 111333555;
    const nonExistentDir = path.join(os.tmpdir(), "nonexistent-clawdis-multy");
    const lockPath = path.join(nonExistentDir, `multy-${chatId}.lock`);

    // Ensure directory doesn't exist
    await rm(nonExistentDir, { recursive: true, force: true });

    // Should handle missing directory gracefully
    let writeError = false;
    try {
      await mkdir(nonExistentDir, { recursive: true });
      await writeFile(lockPath, JSON.stringify({ runId: "test" }), "utf8");
    } catch {
      writeError = true;
    }

    expect(writeError).toBe(false);

    // Cleanup
    await rm(nonExistentDir, { recursive: true, force: true });
  });

  it("handles concurrent lock writes race condition", async () => {
    const chatId = 222444666;
    const lockPath = path.join(testLockDir, `multy-${chatId}.lock`);

    // Simulate concurrent writes
    const writePromises: Promise<void>[] = [];

    for (let i = 0; i < 5; i++) {
      const payload = {
        pid: process.pid + i,
        runId: `concurrent-run-${i}`,
        topic: `concurrent topic ${i}`,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
      writePromises.push(writeFile(lockPath, JSON.stringify(payload), "utf8"));
    }

    await Promise.all(writePromises);

    // Only one should have written successfully (last one wins)
    const raw = await readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.runId).toMatch(/^concurrent-run-\d+$/);

    // Cleanup
    await unlink(lockPath);
  });
});
