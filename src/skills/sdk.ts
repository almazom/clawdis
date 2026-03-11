/**
 * Clawdis Skill SDK - Types and utilities for skill development
 *
 * This module provides TypeScript types and helper functions for creating
 * and managing Clawdis skills programmatically.
 *
 * @example
 * ```typescript
 * import { defineSkill, type SkillDefinition } from "@clawdis/skills";
 *
 * const mySkill: SkillDefinition = defineSkill({
 *   name: "my-skill",
 *   description: "Does something useful",
 *   emoji: "🔧",
 *   requires: {
 *     bins: ["my-cli"],
 *     env: ["MY_API_KEY"],
 *   },
 *   install: [
 *     { kind: "brew", formula: "my-cli", bins: ["my-cli"] },
 *   ],
 * });
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Supported package managers for skill installation
 */
export type InstallKind = "brew" | "node" | "go" | "uv" | "manual";

/**
 * Specification for installing a skill dependency
 */
export interface SkillInstallSpec {
  /** Unique identifier for this install option */
  id?: string;
  /** Type of installer */
  kind: InstallKind;
  /** Display label for this install option */
  label?: string;
  /** Binary names provided by this install */
  bins?: string[];
  /** Brew formula name (for brew kind) */
  formula?: string;
  /** npm/pnpm/yarn package name (for node kind) */
  package?: string;
  /** Go module path (for go kind) */
  module?: string;
  /** Manual installation instructions (for manual kind) */
  instructions?: string;
}

/**
 * Requirements for a skill to be eligible
 */
export interface SkillRequirements {
  /** Required binaries in PATH */
  bins?: string[];
  /** Required environment variables */
  env?: string[];
  /** Required config paths (dot notation, e.g., "browser.enabled") */
  config?: string[];
}

/**
 * Clawdis-specific skill metadata
 */
export interface ClawdisSkillMetadata {
  /** If true, skill is always enabled regardless of requirements */
  always?: boolean;
  /** Override key for config lookups (defaults to skill name) */
  skillKey?: string;
  /** Primary environment variable for API key storage */
  primaryEnv?: string;
  /** Emoji for display */
  emoji?: string;
  /** Homepage URL */
  homepage?: string;
  /** Requirements for skill eligibility */
  requires?: SkillRequirements;
  /** Installation options */
  install?: SkillInstallSpec[];
}

/**
 * Frontmatter metadata for a skill
 */
export interface SkillFrontmatter {
  /** Skill name (kebab-case recommended) */
  name: string;
  /** Short description */
  description: string;
  /** Homepage URL */
  homepage?: string;
  /** Website URL (alias for homepage) */
  website?: string;
  /** URL (alias for homepage) */
  url?: string;
  /** Emoji for display */
  emoji?: string;
  /** Clawdis-specific metadata (JSON string in frontmatter) */
  metadata?: string;
}

/**
 * Complete skill definition
 */
export interface SkillDefinition {
  /** Skill name */
  name: string;
  /** Short description */
  description: string;
  /** Long-form documentation (markdown) */
  documentation?: string;
  /** Homepage URL */
  homepage?: string;
  /** Clawdis metadata */
  clawdis: ClawdisSkillMetadata;
}

/**
 * Skill as loaded from the system
 */
export interface LoadedSkill {
  name: string;
  description: string;
  filePath: string;
  baseDir: string;
  source: string;
  frontmatter: SkillFrontmatter;
  clawdis?: ClawdisSkillMetadata;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Define a skill with full type safety
 *
 * @example
 * ```typescript
 * const skill = defineSkill({
 *   name: "gemini",
 *   description: "Gemini CLI",
 *   emoji: "♊️",
 *   requires: { bins: ["gemini"] },
 *   install: [{ kind: "brew", formula: "gemini-cli", bins: ["gemini"] }],
 * });
 * ```
 */
export function defineSkill(
  def: Omit<SkillDefinition, "clawdis"> &
    Partial<Pick<SkillDefinition, "clawdis">>,
): SkillDefinition {
  return {
    ...def,
    clawdis: def.clawdis ?? {},
  };
}

/**
 * Create a brew install spec
 *
 * @example
 * ```typescript
 * const install = brewInstall("gemini-cli", ["gemini"]);
 * ```
 */
export function brewInstall(
  formula: string,
  bins: string[],
  label?: string,
): SkillInstallSpec {
  return {
    kind: "brew",
    formula,
    bins,
    label: label ?? `Install ${formula} (brew)`,
  };
}

/**
 * Create a node/npm install spec
 *
 * @example
 * ```typescript
 * const install = nodeInstall("@google/gemini-cli", ["gemini"]);
 * ```
 */
export function nodeInstall(
  pkg: string,
  bins: string[],
  label?: string,
): SkillInstallSpec {
  return {
    kind: "node",
    package: pkg,
    bins,
    label: label ?? `Install ${pkg} (npm)`,
  };
}

/**
 * Create a go install spec
 *
 * @example
 * ```typescript
 * const install = goInstall("github.com/user/cli@latest", ["cli"]);
 * ```
 */
export function goInstall(
  module: string,
  bins: string[],
  label?: string,
): SkillInstallSpec {
  return {
    kind: "go",
    module,
    bins,
    label: label ?? `Install ${module} (go)`,
  };
}

/**
 * Create a uv install spec
 *
 * @example
 * ```typescript
 * const install = uvInstall("my-tool", ["my-tool"]);
 * ```
 */
export function uvInstall(
  pkg: string,
  bins: string[],
  label?: string,
): SkillInstallSpec {
  return {
    kind: "uv",
    package: pkg,
    bins,
    label: label ?? `Install ${pkg} (uv)`,
  };
}

/**
 * Create manual install instructions
 *
 * @example
 * ```typescript
 * const install = manualInstall("Set API_KEY environment variable");
 * ```
 */
export function manualInstall(instructions: string): SkillInstallSpec {
  return {
    kind: "manual",
    instructions,
    label: "Manual setup required",
  };
}

/**
 * Create skill requirements
 *
 * @example
 * ```typescript
 * const reqs = requires({
 *   bins: ["gemini"],
 *   env: ["GEMINI_API_KEY"],
 *   config: ["browser.enabled"],
 * });
 * ```
 */
export function requires(reqs: SkillRequirements): SkillRequirements {
  return reqs;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result for a skill
 */
export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a skill definition
 *
 * @example
 * ```typescript
 * const result = validateSkill(skill);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateSkill(skill: SkillDefinition): SkillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (!skill.name || skill.name.trim() === "") {
    errors.push("Skill name is required");
  } else if (!/^[a-z0-9-]+$/.test(skill.name)) {
    warnings.push("Skill name should use kebab-case (lowercase with hyphens)");
  }

  // Description validation
  if (!skill.description || skill.description.trim() === "") {
    errors.push("Skill description is required");
  } else if (skill.description.length < 10) {
    warnings.push("Description should be at least 10 characters");
  }

  // Install spec validation
  if (skill.clawdis?.install) {
    for (const inst of skill.clawdis.install) {
      if (inst.kind === "brew" && !inst.formula) {
        errors.push(
          `Brew install spec missing formula: ${inst.id ?? "unnamed"}`,
        );
      }
      if (inst.kind === "node" && !inst.package) {
        errors.push(
          `Node install spec missing package: ${inst.id ?? "unnamed"}`,
        );
      }
      if (inst.kind === "go" && !inst.module) {
        errors.push(`Go install spec missing module: ${inst.id ?? "unnamed"}`);
      }
      if (inst.kind === "uv" && !inst.package) {
        errors.push(`Uv install spec missing package: ${inst.id ?? "unnamed"}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize a skill definition to SKILL.md content
 *
 * @example
 * ```typescript
 * const content = serializeSkillToMarkdown(skill);
 * await fs.writeFile("SKILL.md", content);
 * ```
 */
export function serializeSkillToMarkdown(skill: SkillDefinition): string {
  const frontmatter: SkillFrontmatter = {
    name: skill.name,
    description: skill.description,
  };

  if (skill.homepage) {
    frontmatter.homepage = skill.homepage;
  }

  if (skill.clawdis.emoji) {
    frontmatter.emoji = skill.clawdis.emoji;
  }

  if (skill.clawdis && Object.keys(skill.clawdis).length > 0) {
    frontmatter.metadata = JSON.stringify({ clawdis: skill.clawdis });
  }

  // Build frontmatter YAML
  const fmLines: string[] = ["---"];
  fmLines.push(`name: ${frontmatter.name}`);
  fmLines.push(`description: ${frontmatter.description}`);
  if (frontmatter.homepage) fmLines.push(`homepage: ${frontmatter.homepage}`);
  if (frontmatter.emoji) fmLines.push(`emoji: ${frontmatter.emoji}`);
  if (frontmatter.metadata) fmLines.push(`metadata: ${frontmatter.metadata}`);
  fmLines.push("---");

  // Documentation
  const docs =
    skill.documentation ?? `# ${skill.name}\n\n${skill.description}\n`;

  return `${fmLines.join("\n")}\n\n${docs}\n`;
}

/**
 * Parse skill metadata from SKILL.md content
 *
 * @example
 * ```typescript
 * const content = await fs.readFile("SKILL.md", "utf-8");
 * const skill = parseSkillFromMarkdown(content);
 * ```
 */
export function parseSkillFromMarkdown(
  content: string,
): Partial<SkillDefinition> {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Check for frontmatter
  if (!lines[0]?.startsWith("---")) {
    return { documentation: content };
  }

  // Find end of frontmatter
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.startsWith("---")) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { documentation: content };
  }

  // Parse frontmatter
  const frontmatterLines = lines.slice(1, endIndex);
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterLines) {
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      frontmatter[key] = value.trim().replace(/^["']|["']$/g, "");
    }
  }

  // Parse metadata JSON
  let clawdis: ClawdisSkillMetadata | undefined;
  if (frontmatter.metadata) {
    try {
      const parsed = JSON.parse(frontmatter.metadata);
      clawdis = parsed.clawdis;
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Documentation is everything after frontmatter
  const documentation = lines
    .slice(endIndex + 1)
    .join("\n")
    .trim();

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    homepage: frontmatter.homepage,
    clawdis: clawdis ?? {},
    documentation,
  };
}
