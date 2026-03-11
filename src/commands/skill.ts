import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildWorkspaceSkillsPrompt,
  loadWorkspaceSkillEntries,
} from "../agents/skills.js";
import { installSkill } from "../agents/skills-install.js";
import {
  buildWorkspaceSkillStatus,
  type SkillStatusEntry,
} from "../agents/skills-status.js";
import {
  type ClawdisConfig,
  loadConfig,
  writeConfigFile,
} from "../config/config.js";
import { resolveUserPath } from "../utils.js";

export type SkillListFormat = "table" | "json" | "names";

export type SkillListOptions = {
  format?: SkillListFormat;
  all?: boolean;
  workspace?: string;
};

export type SkillStatusOptions = {
  format?: "table" | "json";
  workspace?: string;
};

export type SkillEnableOptions = {
  workspace?: string;
};

export type SkillDisableOptions = {
  workspace?: string;
};

export type SkillCreateOptions = {
  description?: string;
  emoji?: string;
  requires?: string[];
  workspace?: string;
};

export type SkillInstallOptions = {
  dryRun?: boolean;
  installId?: string;
  timeout?: number;
  workspace?: string;
};

type SkillRequirements = Record<string, string[]>;

function resolveWorkspaceDir(opts?: { workspace?: string }): string {
  const cfg = loadConfig();
  const raw =
    opts?.workspace ?? cfg.agent?.workspace ?? path.join(os.homedir(), "clawd");
  return resolveUserPath(raw);
}

function loadSkillConfig(): ClawdisConfig {
  try {
    return loadConfig();
  } catch {
    return {};
  }
}

function formatStatusEmoji(entry: SkillStatusEntry): string {
  if (entry.disabled) return "⚫";
  if (entry.eligible) return "🟢";
  return "🟡";
}

function resolveStatusLabel(entry: SkillStatusEntry): string {
  if (entry.disabled) return "disabled";
  if (entry.eligible) return "active";
  return "pending";
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 3)}...`;
}

function addRequirement(
  requirements: SkillRequirements,
  key: string,
  value: string,
): void {
  const values = requirements[key] ?? [];
  values.push(value);
  requirements[key] = values;
}

function resolveRequirementKey(type: string): string {
  switch (type) {
    case "bin":
      return "bins";
    case "env":
      return "env";
    case "config":
      return "config";
    default:
      return type;
  }
}

function buildSkillRequirements(requirements: string[]): SkillRequirements {
  const result: SkillRequirements = {};

  for (const requirement of requirements) {
    if (!requirement.includes(":")) {
      addRequirement(result, "bins", requirement);
      continue;
    }

    const [type, value] = requirement.split(":");
    addRequirement(result, resolveRequirementKey(type), value);
  }

  return result;
}

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

function findSkillStatusEntry(
  skillName: string,
  workspaceDir: string,
  config: ClawdisConfig,
): SkillStatusEntry {
  const report = buildWorkspaceSkillStatus(workspaceDir, { config });
  const entry = report.skills.find((skill) => skill.name === skillName);
  if (!entry) {
    exitWithError(`Skill not found: ${skillName}`);
  }
  return entry;
}

async function updateSkillEnabledState(
  skillName: string,
  enabled: boolean,
): Promise<void> {
  const cfg = loadSkillConfig();
  cfg.skills ??= {};
  const skillConfig = cfg.skills[skillName] ?? {};
  skillConfig.enabled = enabled;
  cfg.skills[skillName] = skillConfig;
  await writeConfigFile(cfg);
}

export async function skillListCommand(opts: SkillListOptions): Promise<void> {
  const workspaceDir = resolveWorkspaceDir(opts);
  const cfg = loadSkillConfig();
  const report = buildWorkspaceSkillStatus(workspaceDir, { config: cfg });
  const entries = opts.all
    ? report.skills
    : report.skills.filter((entry) => entry.eligible && !entry.disabled);

  if (entries.length === 0) {
    console.log("No skills found.");
    console.log("\nDirectories searched:");
    console.log(`  Workspace: ${path.join(workspaceDir, "skills")}`);
    console.log(`  Managed:   ${report.managedSkillsDir}`);
    return;
  }

  switch (opts.format) {
    case "json": {
      console.log(JSON.stringify(entries, null, 2));
      break;
    }
    case "names": {
      for (const entry of entries) {
        console.log(entry.name);
      }
      break;
    }
    default: {
      console.log(`\n${"Skill".padEnd(20)} ${"Status".padEnd(10)} Description`);
      console.log("-".repeat(70));
      for (const entry of entries) {
        const status = resolveStatusLabel(entry);
        const emoji = formatStatusEmoji(entry);
        const name = truncate(entry.name, 18).padEnd(20);
        const statusStr = `${emoji} ${status}`.padEnd(10);
        const desc = truncate(entry.description, 35);
        console.log(`${name} ${statusStr} ${desc}`);
      }
      const suffix = opts.all ? "" : " (eligible only; use --all to see all)";
      console.log(`\n${entries.length} skill(s)${suffix}`);
    }
  }
}

export async function skillStatusCommand(
  skillName: string,
  opts: SkillStatusOptions,
): Promise<void> {
  const workspaceDir = resolveWorkspaceDir(opts);
  const cfg = loadSkillConfig();
  const entry = findSkillStatusEntry(skillName, workspaceDir, cfg);

  if (opts.format === "json") {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  console.log(`\n${formatStatusEmoji(entry)} ${entry.name}`);
  console.log(`  Status:      ${resolveStatusLabel(entry)}`);
  console.log(`  Description: ${entry.description}`);
  console.log(`  Source:      ${entry.source}`);
  console.log(`  Path:        ${entry.filePath}`);
  if (entry.emoji) console.log(`  Emoji:       ${entry.emoji}`);
  if (entry.homepage) console.log(`  Homepage:    ${entry.homepage}`);
  if (entry.primaryEnv) console.log(`  Primary Env: ${entry.primaryEnv}`);

  const hasMissing =
    entry.missing.bins.length > 0 ||
    entry.missing.env.length > 0 ||
    entry.missing.config.length > 0;

  if (hasMissing) {
    console.log("\n  Missing Requirements:");
    for (const bin of entry.missing.bins) {
      console.log(`    ❌ Binary: ${bin}`);
    }
    for (const env of entry.missing.env) {
      console.log(`    ❌ Environment: ${env}`);
    }
    for (const cfgPath of entry.missing.config) {
      console.log(`    ❌ Config: ${cfgPath}`);
    }
  }

  if (entry.install.length > 0) {
    console.log("\n  Install Options:");
    for (const install of entry.install) {
      console.log(`    • ${install.label} (${install.kind})`);
    }
  }
}

export async function skillEnableCommand(
  skillName: string,
  _opts: SkillEnableOptions,
): Promise<void> {
  await updateSkillEnabledState(skillName, true);
  console.log(`✅ Skill enabled: ${skillName}`);
}

export async function skillDisableCommand(
  skillName: string,
  _opts: SkillDisableOptions,
): Promise<void> {
  await updateSkillEnabledState(skillName, false);
  console.log(`⛔ Skill disabled: ${skillName}`);
}

export async function skillPromptCommand(opts?: {
  workspace?: string;
}): Promise<void> {
  const workspaceDir = resolveWorkspaceDir(opts);
  const cfg = loadSkillConfig();
  const prompt = buildWorkspaceSkillsPrompt(workspaceDir, { config: cfg });
  console.log(prompt);
}

export async function skillInstallCommand(
  skillName: string,
  opts: SkillInstallOptions,
): Promise<void> {
  const workspaceDir = resolveWorkspaceDir(opts);
  const cfg = loadSkillConfig();
  const entry = findSkillStatusEntry(skillName, workspaceDir, cfg);

  if (entry.install.length === 0) {
    exitWithError(`No installers configured for skill: ${skillName}`);
  }

  const installOption = opts.installId
    ? entry.install.find((option) => option.id === opts.installId)
    : entry.install[0];

  if (!installOption) {
    const available = entry.install.map((option) => option.id).join(", ");
    exitWithError(
      `Installer not found for ${skillName}: ${opts.installId}. Available: ${available}`,
    );
  }

  if (opts.dryRun) {
    console.log(
      `🧪 Dry run: would install ${skillName} via ${installOption.label} (${installOption.id})`,
    );
    return;
  }

  const result = await installSkill({
    workspaceDir,
    skillName,
    installId: installOption.id,
    timeoutMs: opts.timeout,
    config: cfg,
  });

  if (!result.ok) {
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    exitWithError(`Install failed for ${skillName}: ${result.message}`);
  }

  console.log(
    `✅ Installed ${skillName} via ${installOption.label} (${installOption.id})`,
  );
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
}

export async function skillCreateCommand(
  name: string,
  opts: SkillCreateOptions,
): Promise<void> {
  const workspaceDir = resolveWorkspaceDir(opts);
  const skillsDir = path.join(workspaceDir, "skills");
  const skillDir = path.join(skillsDir, name);

  let skillExists = true;
  try {
    await fs.access(skillDir);
  } catch {
    skillExists = false;
  }

  if (skillExists) {
    exitWithError(`❌ Skill already exists: ${skillDir}`);
  }

  await fs.mkdir(skillDir, { recursive: true });

  const description = opts.description ?? `${name} skill`;
  const emoji = opts.emoji ?? "🔧";
  const metadata: { clawdis: Record<string, unknown> } = {
    clawdis: { emoji },
  };

  if (opts.requires && opts.requires.length > 0) {
    const requires = buildSkillRequirements(opts.requires);
    metadata.clawdis = { ...metadata.clawdis, requires };
  }

  const frontmatter = `---
name: ${name}
description: ${description}
metadata: ${JSON.stringify(metadata)}
---
`;

  const body = `
# ${name}

${description}

## Usage

Describe how to use this skill here.

## Examples

\`\`\`bash
# Add example commands here
\`\`\`

## Configuration

Describe any configuration options here.
`;

  const skillMdPath = path.join(skillDir, "SKILL.md");
  await fs.writeFile(skillMdPath, frontmatter + body, "utf-8");

  console.log(`✅ Created skill: ${name}`);
  console.log(`   Path: ${skillMdPath}`);
  console.log(`\nEdit ${skillMdPath} to customize your skill.`);
}

export async function skillValidateCommand(opts?: {
  workspace?: string;
}): Promise<void> {
  const workspaceDir = resolveWorkspaceDir(opts);
  const cfg = loadSkillConfig();
  const entries = loadWorkspaceSkillEntries(workspaceDir, { config: cfg });

  let errors = 0;
  let warnings = 0;

  for (const entry of entries) {
    const issues: string[] = [];

    if (!entry.skill.name || entry.skill.name.trim() === "") {
      issues.push("Missing or empty skill name");
      errors++;
    }

    if (!entry.skill.description || entry.skill.description.trim() === "") {
      issues.push("Missing or empty description");
      warnings++;
    }

    if (!entry.skill.filePath || !entry.skill.filePath.endsWith("SKILL.md")) {
      issues.push("Invalid file path (should end with SKILL.md)");
      errors++;
    }

    try {
      await fs.access(entry.skill.filePath);
    } catch {
      issues.push(`File not accessible: ${entry.skill.filePath}`);
      errors++;
    }

    if (issues.length === 0) continue;

    console.log(`\n${entry.skill.name}:`);
    for (const issue of issues) {
      const isError =
        issue.includes("Missing name") ||
        issue.includes("Invalid") ||
        issue.includes("not accessible");
      console.log(`  ${isError ? "❌" : "⚠️"}  ${issue}`);
    }
  }

  if (errors === 0 && warnings === 0) {
    console.log(`✅ All ${entries.length} skill(s) are valid`);
    return;
  }

  console.log(`\n${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0) {
    process.exit(1);
  }
}
