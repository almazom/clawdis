/**
 * Clawdis Skill SDK
 *
 * First-class skills support for Clawdis.
 *
 * @module @clawdis/skills
 */

export {
  brewInstall,
  type ClawdisSkillMetadata,
  // Helper functions
  defineSkill,
  goInstall,
  // Types
  type InstallKind,
  type LoadedSkill,
  manualInstall,
  nodeInstall,
  parseSkillFromMarkdown,
  requires,
  type SkillDefinition,
  type SkillFrontmatter,
  type SkillInstallSpec,
  type SkillRequirements,
  type SkillValidationResult,
  // Serialization
  serializeSkillToMarkdown,
  uvInstall,
  // Validation
  validateSkill,
} from "./sdk.js";
