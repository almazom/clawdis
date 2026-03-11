import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  skillCreateCommand,
  skillDisableCommand,
  skillEnableCommand,
  skillListCommand,
  skillStatusCommand,
  skillValidateCommand,
} from "./skill.js";

describe("skill commands", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdis-skill-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create skills directory
    await fs.mkdir(path.join(tempDir, "skills"), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestSkill(
    name: string,
    description = "Test skill",
  ): Promise<void> {
    const skillDir = path.join(tempDir, "skills", name);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: ${name}
description: ${description}
---

# ${name}

${description}
`,
      "utf-8",
    );
  }

  describe("skillCreateCommand", () => {
    it("creates a new skill with defaults", async () => {
      await skillCreateCommand("my-skill", {
        workspace: tempDir,
      });

      const skillPath = path.join(tempDir, "skills", "my-skill", "SKILL.md");
      const content = await fs.readFile(skillPath, "utf-8");

      expect(content).toContain("name: my-skill");
      expect(content).toContain("description: my-skill skill");
      expect(content).toContain("🔧");
    });

    it("creates a skill with custom options", async () => {
      await skillCreateCommand("custom-skill", {
        workspace: tempDir,
        description: "Custom description",
        emoji: "🚀",
        requires: ["bin:test-cli", "env:API_KEY"],
      });

      const skillPath = path.join(
        tempDir,
        "skills",
        "custom-skill",
        "SKILL.md",
      );
      const content = await fs.readFile(skillPath, "utf-8");

      expect(content).toContain("name: custom-skill");
      expect(content).toContain("description: Custom description");
      expect(content).toContain('"emoji":"🚀"');
      expect(content).toContain('"bins":["test-cli"]');
      expect(content).toContain('"env":["API_KEY"]');
    });

    it("logs error if skill already exists", async () => {
      await createTestSkill("existing-skill");

      // Capture console.error and process.exit
      const errors: string[] = [];
      const originalError = console.error;
      let exitCode: number | undefined;

      console.error = (...args) => errors.push(args.join(" "));
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error(`Exit ${code}`);
      }) as typeof process.exit;

      try {
        await skillCreateCommand("existing-skill", { workspace: tempDir });
      } catch {
        // Expected
      } finally {
        console.error = originalError;
        process.exit = originalExit;
      }

      expect(exitCode).toBe(1);
    });
  });

  describe("skillListCommand", () => {
    it("lists skills in table format", async () => {
      await createTestSkill("skill-one", "First test skill");
      await createTestSkill("skill-two", "Second test skill");

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      try {
        await skillListCommand({ workspace: tempDir, format: "table" });
      } finally {
        console.log = originalLog;
      }

      const output = logs.join("\n");
      expect(output).toContain("skill-one");
      expect(output).toContain("skill-two");
      expect(output).toContain("First test skill");
    });

    it("lists skills in JSON format", async () => {
      await createTestSkill("json-skill", "JSON test skill");

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      try {
        await skillListCommand({ workspace: tempDir, format: "json" });
      } finally {
        console.log = originalLog;
      }

      const output = logs.join("\n");
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it("lists skill names only", async () => {
      await createTestSkill("name-only", "Name test");

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      try {
        await skillListCommand({ workspace: tempDir, format: "names" });
      } finally {
        console.log = originalLog;
      }

      const output = logs.join("\n");
      expect(output).toContain("name-only");
    });
  });

  describe("skillStatusCommand", () => {
    it("shows status for a skill", async () => {
      await createTestSkill("status-skill", "Status test skill");

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      try {
        await skillStatusCommand("status-skill", { workspace: tempDir });
      } finally {
        console.log = originalLog;
      }

      const output = logs.join("\n");
      expect(output).toContain("status-skill");
      expect(output).toContain("active");
    });

    it("throws for non-existent skill", async () => {
      await expect(
        skillStatusCommand("non-existent", { workspace: tempDir }),
      ).rejects.toThrow();
    });
  });

  describe("skillValidateCommand", () => {
    it("validates all skills successfully", async () => {
      await createTestSkill("valid-skill", "Valid test skill");

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      try {
        await skillValidateCommand({ workspace: tempDir });
      } finally {
        console.log = originalLog;
      }

      const output = logs.join("\n");
      expect(output).toContain("✅");
      expect(output).toContain("valid");
    });
  });

  describe("skillEnableDisableCommands", () => {
    it("disables and enables a skill", async () => {
      await createTestSkill("toggle-skill", "Toggle test skill");

      // Disable
      const disableLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => disableLogs.push(args.join(" "));

      try {
        await skillDisableCommand("toggle-skill", { workspace: tempDir });
      } finally {
        console.log = originalLog;
      }

      expect(disableLogs.join(" ")).toContain("disabled");

      // Enable
      const enableLogs: string[] = [];
      console.log = (...args) => enableLogs.push(args.join(" "));

      try {
        await skillEnableCommand("toggle-skill", { workspace: tempDir });
      } finally {
        console.log = originalLog;
      }

      expect(enableLogs.join(" ")).toContain("enabled");
    });
  });
});
