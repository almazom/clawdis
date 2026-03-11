import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  skillCreateCommand,
  skillDisableCommand,
  skillEnableCommand,
  skillInstallCommand,
  skillListCommand,
  skillStatusCommand,
  skillValidateCommand,
} from "./skill.js";

describe("skill commands", () => {
  let tempDir: string;
  let originalCwd: string;

  function formatConsoleArgs(args: unknown[]): string {
    return args.map(String).join(" ");
  }

  function getSkillPath(name: string): string {
    return path.join(tempDir, "skills", name, "SKILL.md");
  }

  async function readSkillFile(name: string): Promise<string> {
    return fs.readFile(getSkillPath(name), "utf-8");
  }

  async function captureLogs(run: () => Promise<void>): Promise<string> {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(formatConsoleArgs(args));

    try {
      await run();
    } finally {
      console.log = originalLog;
    }

    return logs.join("\n");
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdis-skill-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    await fs.mkdir(path.join(tempDir, "skills"), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestSkill(
    name: string,
    description = "Test skill",
    metadata?: string,
  ): Promise<void> {
    const skillDir = path.join(tempDir, "skills", name);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: ${name}
description: ${description}
${metadata ? `metadata: ${metadata}\n` : ""}---

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

      const content = await readSkillFile("my-skill");

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

      const content = await readSkillFile("custom-skill");

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
      const originalExit = process.exit.bind(process);
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

      const output = await captureLogs(async () => {
        await skillListCommand({ workspace: tempDir, format: "table" });
      });
      expect(output).toContain("skill-one");
      expect(output).toContain("skill-two");
      expect(output).toContain("First test skill");
    });

    it("lists skills in JSON format", async () => {
      await createTestSkill("json-skill", "JSON test skill");

      const output = await captureLogs(async () => {
        await skillListCommand({ workspace: tempDir, format: "json" });
      });
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it("lists skill names only", async () => {
      await createTestSkill("name-only", "Name test");

      const output = await captureLogs(async () => {
        await skillListCommand({ workspace: tempDir, format: "names" });
      });
      expect(output).toContain("name-only");
    });
  });

  describe("skillStatusCommand", () => {
    it("shows status for a skill", async () => {
      await createTestSkill("status-skill", "Status test skill");

      const output = await captureLogs(async () => {
        await skillStatusCommand("status-skill", { workspace: tempDir });
      });
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

      const output = await captureLogs(async () => {
        await skillValidateCommand({ workspace: tempDir });
      });
      expect(output).toContain("✅");
      expect(output).toContain("valid");
    });
  });

  describe("skillInstallCommand", () => {
    it("prints dry-run installer info", async () => {
      await createTestSkill(
        "install-skill",
        "Install test skill",
        '{"clawdis":{"install":[{"id":"brew","kind":"brew","formula":"demo","bins":["demo"],"label":"Install demo"}]}}',
      );

      const output = await captureLogs(async () => {
        await skillInstallCommand("install-skill", {
          workspace: tempDir,
          dryRun: true,
        });
      });
      expect(output).toContain("would install install-skill");
      expect(output).toContain("Install demo");
    });
  });

  describe("skillEnableDisableCommands", () => {
    it("disables and enables a skill", async () => {
      await createTestSkill("toggle-skill", "Toggle test skill");

      const disableOutput = await captureLogs(async () => {
        await skillDisableCommand("toggle-skill", { workspace: tempDir });
      });
      expect(disableOutput).toContain("disabled");

      const enableOutput = await captureLogs(async () => {
        await skillEnableCommand("toggle-skill", { workspace: tempDir });
      });
      expect(enableOutput).toContain("enabled");
    });
  });
});
