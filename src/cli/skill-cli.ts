import type { Command } from "commander";
import {
  skillCreateCommand,
  skillDisableCommand,
  skillEnableCommand,
  skillInstallCommand,
  skillListCommand,
  skillPromptCommand,
  skillStatusCommand,
  skillValidateCommand,
} from "../commands/skill.js";

async function runSkillAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }
}

export function registerSkillCli(program: Command): void {
  const skillCmd = program
    .command("skill")
    .description("Manage Clawdis skills (SKILL.md bundles)");

  skillCmd
    .command("list")
    .description("List available skills")
    .option(
      "-f, --format <format>",
      "Output format: table, json, names",
      "table",
    )
    .option("-a, --all", "Show all skills including inactive", false)
    .option("-w, --workspace <dir>", "Workspace directory (default: ~/clawd)")
    .action(async (opts) =>
      runSkillAction(async () => {
        await skillListCommand({
          format: opts.format,
          all: opts.all,
          workspace: opts.workspace,
        });
      }),
    );

  skillCmd
    .command("status <name>")
    .description("Show detailed status for a skill")
    .option("-f, --format <format>", "Output format: table, json", "table")
    .option("-w, --workspace <dir>", "Workspace directory")
    .action(async (name: string, opts) =>
      runSkillAction(async () => {
        await skillStatusCommand(name, {
          format: opts.format,
          workspace: opts.workspace,
        });
      }),
    );

  skillCmd
    .command("enable <name>")
    .description("Enable a skill")
    .option("-w, --workspace <dir>", "Workspace directory")
    .action(async (name: string, opts) =>
      runSkillAction(async () => {
        await skillEnableCommand(name, { workspace: opts.workspace });
      }),
    );

  skillCmd
    .command("disable <name>")
    .description("Disable a skill")
    .option("-w, --workspace <dir>", "Workspace directory")
    .action(async (name: string, opts) =>
      runSkillAction(async () => {
        await skillDisableCommand(name, { workspace: opts.workspace });
      }),
    );

  skillCmd
    .command("prompt")
    .description("Print the compiled skills prompt (for debugging)")
    .option("-w, --workspace <dir>", "Workspace directory")
    .action(async (opts) =>
      runSkillAction(async () => {
        await skillPromptCommand({ workspace: opts.workspace });
      }),
    );

  skillCmd
    .command("create <name>")
    .description("Create a new skill template in workspace/skills/")
    .option("-d, --description <text>", "Skill description")
    .option("-e, --emoji <emoji>", "Skill emoji (default: 🔧)")
    .option(
      "-r, --requires <items...>",
      "Requirements (format: bin:name, env:NAME, config:path)",
    )
    .option("-w, --workspace <dir>", "Workspace directory")
    .action(async (name: string, opts) =>
      runSkillAction(async () => {
        await skillCreateCommand(name, {
          description: opts.description,
          emoji: opts.emoji,
          requires: opts.requires,
          workspace: opts.workspace,
        });
      }),
    );

  skillCmd
    .command("validate")
    .description("Validate all skills for errors")
    .option("-w, --workspace <dir>", "Workspace directory")
    .action(async (opts) =>
      runSkillAction(async () => {
        await skillValidateCommand({ workspace: opts.workspace });
      }),
    );

  skillCmd
    .command("install <name>")
    .description("Install missing dependencies for a skill")
    .option("-w, --workspace <dir>", "Workspace directory")
    .option("--dry-run", "Show what would be installed without doing it", false)
    .action(async (name: string, opts) =>
      runSkillAction(async () => {
        await skillInstallCommand(name, {
          workspace: opts.workspace,
          dryRun: opts.dryRun,
        });
      }),
    );

  skillCmd.addHelpText(
    "after",
    `
Examples:
  clawdis skill list                    # List active skills
  clawdis skill list --all              # List all skills including inactive
  clawdis skill status gemini           # Show gemini skill details
  clawdis skill enable my-skill         # Enable a skill
  clawdis skill disable my-skill        # Disable a skill
  clawdis skill create my-skill -d "My custom skill"  # Create new skill
  clawdis skill validate                # Validate all skills
  clawdis skill install my-skill        # Install skill dependencies
`,
  );
}
