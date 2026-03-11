import { describe, expect, it } from "vitest";
import {
  brewInstall,
  defineSkill,
  goInstall,
  manualInstall,
  nodeInstall,
  parseSkillFromMarkdown,
  requires,
  serializeSkillToMarkdown,
  validateSkill,
} from "./sdk.js";

describe("Skill SDK", () => {
  describe("defineSkill", () => {
    it("creates a skill with defaults", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "A test skill",
      });

      expect(skill.name).toBe("test-skill");
      expect(skill.description).toBe("A test skill");
      expect(skill.clawdis).toEqual({});
    });

    it("creates a skill with full metadata", () => {
      const skill = defineSkill({
        name: "gemini",
        description: "Gemini CLI",
        homepage: "https://ai.google.dev",
        clawdis: {
          emoji: "♊️",
          requires: { bins: ["gemini"] },
        },
      });

      expect(skill.clawdis.emoji).toBe("♊️");
      expect(skill.clawdis.requires?.bins).toEqual(["gemini"]);
    });
  });

  describe("install helpers", () => {
    it("brewInstall creates correct spec", () => {
      const spec = brewInstall("gemini-cli", ["gemini"], "Install Gemini");
      expect(spec).toEqual({
        kind: "brew",
        formula: "gemini-cli",
        bins: ["gemini"],
        label: "Install Gemini",
      });
    });

    it("nodeInstall creates correct spec", () => {
      const spec = nodeInstall("@google/gemini-cli", ["gemini"]);
      expect(spec.kind).toBe("node");
      expect(spec.package).toBe("@google/gemini-cli");
      expect(spec.bins).toEqual(["gemini"]);
    });

    it("goInstall creates correct spec", () => {
      const spec = goInstall("github.com/user/cli@latest", ["cli"]);
      expect(spec.kind).toBe("go");
      expect(spec.module).toBe("github.com/user/cli@latest");
    });

    it("manualInstall creates correct spec", () => {
      const spec = manualInstall("Set API_KEY env var");
      expect(spec.kind).toBe("manual");
      expect(spec.instructions).toBe("Set API_KEY env var");
    });
  });

  describe("requires", () => {
    it("creates requirements object", () => {
      const reqs = requires({
        bins: ["gemini"],
        env: ["API_KEY"],
        config: ["browser.enabled"],
      });

      expect(reqs).toEqual({
        bins: ["gemini"],
        env: ["API_KEY"],
        config: ["browser.enabled"],
      });
    });
  });

  describe("validateSkill", () => {
    it("validates a correct skill", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "A test skill for demonstration",
      });

      const result = validateSkill(skill);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails for missing name", () => {
      const skill = defineSkill({
        name: "",
        description: "A test skill",
      });

      const result = validateSkill(skill);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skill name is required");
    });

    it("fails for missing description", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "",
      });

      const result = validateSkill(skill);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Skill description is required");
    });

    it("warns for short description", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "Short",
      });

      const result = validateSkill(skill);
      expect(result.warnings).toContain(
        "Description should be at least 10 characters",
      );
    });

    it("validates install specs", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "A test skill",
        clawdis: {
          install: [
            { kind: "brew", formula: "", bins: ["bin"] },
            { kind: "node", package: "", bins: ["bin"] },
          ],
        },
      });

      const result = validateSkill(skill);
      expect(result.errors).toContain(
        "Brew install spec missing formula: unnamed",
      );
      expect(result.errors).toContain(
        "Node install spec missing package: unnamed",
      );
    });
  });

  describe("serializeSkillToMarkdown", () => {
    it("serializes basic skill", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "A test skill",
      });

      const md = serializeSkillToMarkdown(skill);
      expect(md).toContain("---");
      expect(md).toContain("name: test-skill");
      expect(md).toContain("description: A test skill");
      expect(md).toContain("# test-skill");
    });

    it("serializes skill with metadata", () => {
      const skill = defineSkill({
        name: "gemini",
        description: "Gemini CLI",
        homepage: "https://ai.google.dev",
        clawdis: {
          emoji: "♊️",
          requires: { bins: ["gemini"] },
        },
      });

      const md = serializeSkillToMarkdown(skill);
      expect(md).toContain("homepage: https://ai.google.dev");
      expect(md).toContain('"emoji":"♊️"');
      expect(md).toContain('"requires":{"bins":["gemini"]}');
    });

    it("uses custom documentation if provided", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "A test skill",
        documentation: "# Custom\n\nCustom docs here",
      });

      const md = serializeSkillToMarkdown(skill);
      expect(md).toContain("# Custom");
      expect(md).toContain("Custom docs here");
    });
  });

  describe("parseSkillFromMarkdown", () => {
    it("parses basic skill", () => {
      const md = `---
name: test-skill
description: A test skill
---

# Test Skill

Documentation here.
`;

      const skill = parseSkillFromMarkdown(md);
      expect(skill.name).toBe("test-skill");
      expect(skill.description).toBe("A test skill");
      expect(skill.documentation).toContain("# Test Skill");
    });

    it("parses skill with metadata", () => {
      const md = `---
name: gemini
description: Gemini CLI
homepage: https://ai.google.dev
metadata: {"clawdis":{"emoji":"♊️","requires":{"bins":["gemini"]}}}
---

# Gemini

Use Gemini CLI.
`;

      const skill = parseSkillFromMarkdown(md);
      expect(skill.name).toBe("gemini");
      expect(skill.homepage).toBe("https://ai.google.dev");
      expect(skill.clawdis?.emoji).toBe("♊️");
      expect(skill.clawdis?.requires?.bins).toEqual(["gemini"]);
    });

    it("handles content without frontmatter", () => {
      const md = "# Just Markdown\n\nNo frontmatter here.";
      const skill = parseSkillFromMarkdown(md);
      expect(skill.documentation).toBe(md);
      expect(skill.name).toBeUndefined();
    });
  });

  describe("roundtrip serialization", () => {
    it("preserves skill through serialize and parse", () => {
      const original = defineSkill({
        name: "test-skill",
        description: "A test skill for demonstration",
        homepage: "https://example.com",
        clawdis: {
          emoji: "🧪",
          requires: { bins: ["test-bin"] },
        },
      });

      const md = serializeSkillToMarkdown(original);
      const parsed = parseSkillFromMarkdown(md);

      expect(parsed.name).toBe(original.name);
      expect(parsed.description).toBe(original.description);
      expect(parsed.homepage).toBe(original.homepage);
      expect(parsed.clawdis?.emoji).toBe(original.clawdis.emoji);
    });
  });
});
