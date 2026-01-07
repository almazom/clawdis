#!/usr/bin/env node
// minimax_cli_web - MiniMax Claude web search wrapper
// Usage: minimax_cli_web "your query"

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
const env = {
  ...process.env,
  ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic",
  ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_MINIMAX_API_KEY,
  ANTHROPIC_SMALL_FAST_MODEL: process.env.ANTHROPIC_MINIMAX_MODEL || "MiniMax-M2.1",
  ANTHROPIC_DEFAULT_OPUS_MODEL: process.env.ANTHROPIC_MINIMAX_MODEL || "MiniMax-M2.1",
  ANTHROPIC_DEFAULT_HAIKU_MODEL: process.env.ANTHROPIC_MINIMAX_MODEL || "MiniMax-M2.1",
  ANTHROPIC_DEFAULT_SONNET_MODEL: process.env.ANTHROPIC_MINIMAX_MODEL || "MiniMax-M2.1",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  HTTP_PROXY: "",
  HTTPS_PROXY: "",
  NO_PROXY: "*",
  PATH: `/home/almaz/.local/share/fnm/node-versions/v22.21.1/installation/bin:${process.env.PATH}`
};

try {
  const result = execSync(
    `claude -p "use builtin tools, web_search, web_fetch, for looking for: ${QUERY} [ANSWER in Russian]" --dangerously-skip-permissions --output-format json 2>&1`,
    {
      timeout: TIMEOUT_SECONDS * 1000,
      env: env,
      maxBuffer: 50 * 1024 * 1024,
      shell: '/bin/bash'
    }
  );
  
  console.log(result.toString());
} catch (err) {
  if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM') {
    console.log(`{"error": "MiniMax timeout (${TIMEOUT_SECONDS}s)"}`);
    process.exit(1);
  }
  
  if (err.stdout) {
    console.log(err.stdout.toString());
  } else {
    console.log(`{"error": "MiniMax failed: ${err.message}"}`);
  }
  process.exit(err.status || 1);
}
