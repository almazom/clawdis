#!/usr/bin/env node
// glm_cli_web - GLM (Z.AI) Claude web search wrapper
// Usage: glm_cli_web "your query"

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment files
const projectRoot = join(__dirname, '..', '..');
const envFile = join(projectRoot, '.env');
const secretsFile = join(process.env.HOME, '.clawdis', 'secrets.env');

// Helper to load env file
try {
  const envContent = readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...value] = line.split('=');
      if (key && value.length > 0) {
        process.env[key.trim()] = value.join('=').trim();
      }
    }
  });
} catch (e) {
  // Ignore if file doesn't exist
}

try {
  const secretsContent = readFileSync(secretsFile, 'utf8');
  secretsContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...value] = line.split('=');
      if (key && value.length > 0) {
        process.env[key.trim()] = value.join('=').trim();
      }
    }
  });
} catch (e) {
  // Ignore if file doesn't exist
}

const QUERY = process.argv[2];

if (!QUERY) {
  console.log('{"error": "No query provided"}');
  process.exit(1);
}

// Get timeout
const TIMEOUT_MS = parseInt(process.env.WEB_SEARCH_TIMEOUT_MS || '180000');
const TIMEOUT_SECONDS = Math.max(60, Math.floor(TIMEOUT_MS / 1000));

// Set environment
const nodeBinPrefix = process.env.CLAWDIS_NODE_BIN_PATH?.trim();
const pathEnv = nodeBinPrefix
  ? `${nodeBinPrefix}:${process.env.PATH ?? ""}`
  : (process.env.PATH ?? "");

const env = {
  ...process.env,
  ANTHROPIC_BASE_URL: "https://api.z.ai/api/anthropic",
  ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_ZAI_API_KEY,
  ANTHROPIC_SMALL_FAST_MODEL: process.env.ANTHROPIC_ZAI_MODEL || "glm-4.7",
  ANTHROPIC_DEFAULT_OPUS_MODEL: process.env.ANTHROPIC_ZAI_MODEL || "glm-4.7",
  ANTHROPIC_DEFAULT_HAIKU_MODEL: process.env.ANTHROPIC_ZAI_MODEL || "glm-4.7",
  ANTHROPIC_DEFAULT_SONNET_MODEL: process.env.ANTHROPIC_ZAI_MODEL || "glm-4.7",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  HTTP_PROXY: "",
  HTTPS_PROXY: "",
  NO_PROXY: "*",
  PATH: pathEnv,
};

try {
  const prompt = `use builtin tools, web_search, web_fetch, for looking for: ${QUERY} [ANSWER in Russian]`;
  const claudeBinary = process.env.CLAUDE_CLI_PATH || "claude";
  const result = spawnSync(
    claudeBinary,
    ["-p", prompt, "--dangerously-skip-permissions", "--output-format", "json"],
    {
      timeout: TIMEOUT_SECONDS * 1000,
      env,
      maxBuffer: 50 * 1024 * 1024,
    },
  );

  const stdout = result.stdout ? result.stdout.toString() : "";
  const stderr = result.stderr ? result.stderr.toString() : "";
  const output = `${stdout}${stderr}`;

  if (result.error) {
    if (result.error.code === 'ETIMEDOUT' || result.signal === 'SIGTERM') {
      console.log(`{"error": "GLM timeout (${TIMEOUT_SECONDS}s)"}`);
      process.exit(1);
    }
    if (output) {
      console.log(output);
    } else {
      console.log(`{"error": "GLM failed: ${result.error.message}"}`);
    }
    process.exit(1);
  }

  if (result.status && result.status !== 0) {
    if (output) {
      console.log(output);
    } else {
      console.log(`{"error": "GLM failed with status ${result.status}"}`);
    }
    process.exit(result.status);
  }

  console.log(output);
} catch (err) {
  console.log(`{"error": "GLM failed: ${err instanceof Error ? err.message : String(err)}"}`);
  process.exit(1);
}
