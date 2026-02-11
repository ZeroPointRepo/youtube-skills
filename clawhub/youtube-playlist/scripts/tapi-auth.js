#!/usr/bin/env node

// ============================================================================
// TranscriptAPI CLI — Passwordless Account Setup (ClawHub Edition)
//
// Minimal version for ClawHub registry. Only writes to ~/.openclaw/openclaw.json.
// For shell RC writes, use the standard version in skills/*/scripts/tapi-auth.js.
//
// Authentication flow:
//   1. User provides email → server creates account and returns a short-lived
//      session token (JWT, expires in ~30 min). No password is involved.
//   2. Server sends a one-time 6-digit verification code to the email.
//   3. User provides the code → server verifies and returns an API key.
//   4. API key is saved to ~/.openclaw/openclaw.json for agent runtime access.
//
// Source: https://transcriptapi.com | Docs: https://docs.transcriptapi.com
// ============================================================================

const VERSION = "3.0.0";
const BASE_URL = "https://transcriptapi.com/api/auth";

// ============================================================================
// Utilities
// ============================================================================

const fs = require("fs");
const path = require("path");
const os = require("os");

function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    } else {
      result._.push(arg);
    }
  }
  return result;
}

function isHumanMode(args) {
  return !!args.human;
}

function err(msg, humanMode = false) {
  if (humanMode) {
    console.error(`Error: ${msg}`);
  } else {
    console.error(JSON.stringify({ error: msg }));
  }
  process.exit(1);
}

function out(msg, humanMode = false, data = null) {
  if (humanMode) {
    console.log(msg);
  } else {
    console.log(JSON.stringify(data || { message: msg }));
  }
}

async function httpRequest(url, options = {}) {
  const response = await fetch(url, options);
  let body;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { status: response.status, ok: response.ok, body };
}

// ============================================================================
// API Functions
// ============================================================================

async function registerCli(email, name) {
  const payload = { email };
  if (name) payload.name = name;

  const res = await httpRequest(`${BASE_URL}/register-cli`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("Account already exists with this email");
    }
    const msg = res.body?.detail || res.body?.message || JSON.stringify(res.body);
    throw new Error(`Registration failed: ${msg}`);
  }

  return res.body;
}

async function verifyCli(sessionToken, otp) {
  const res = await httpRequest(`${BASE_URL}/verify-cli`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ otp }),
  });

  if (!res.ok) {
    const msg = res.body?.detail || res.body?.message || "Verification failed";
    throw new Error(msg);
  }

  return res.body;
}

async function getApiKeys(token) {
  const res = await httpRequest(`${BASE_URL}/api-keys`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const msg = res.body?.detail || res.body?.message || "Failed to get API keys";
    throw new Error(msg);
  }

  return res.body;
}

async function createApiKey(token, name = "default") {
  const res = await httpRequest(`${BASE_URL}/api-keys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const msg = res.body?.detail || res.body?.message || "Failed to create API key";
    throw new Error(msg);
  }

  return res.body;
}

async function getMe(token) {
  const res = await httpRequest(`${BASE_URL}/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const msg = res.body?.detail || res.body?.message || "Failed to get user info";
    throw new Error(msg);
  }

  return res.body;
}

async function getEmailVerificationStatus(token) {
  const res = await httpRequest(`${BASE_URL}/email-verification-status`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const msg = res.body?.detail || res.body?.message || "Failed to get verification status";
    throw new Error(msg);
  }

  return res.body;
}

// ============================================================================
// File System Helpers — OpenClaw config only
// ============================================================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + ".bak";
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  return null;
}

// Save API key to ~/.openclaw/openclaw.json only.
// Returns { files, warnings }.
function saveApiKeyToConfigs(key) {
  const home = os.homedir();
  const filesWritten = [];
  const warnings = [];

  const openclawConfigPath = path.join(home, ".openclaw", "openclaw.json");

  try {
    ensureDir(path.join(home, ".openclaw"));
    backupFile(openclawConfigPath);

    let config = {};
    if (fs.existsSync(openclawConfigPath)) {
      const configContent = fs.readFileSync(openclawConfigPath, "utf8");
      config = JSON.parse(configContent);
    }

    if (!config.skills) config.skills = {};
    if (!config.skills.entries) config.skills.entries = {};
    if (!config.skills.entries.transcriptapi) {
      config.skills.entries.transcriptapi = {};
    }
    config.skills.entries.transcriptapi.apiKey = key;
    config.skills.entries.transcriptapi.enabled = true;

    fs.writeFileSync(openclawConfigPath, JSON.stringify(config, null, 2));
    filesWritten.push({ path: openclawConfigPath, action: "updated", type: "openclaw-config" });
  } catch (e) {
    warnings.push(`Could not update ${openclawConfigPath}: ${e.message}`);
  }

  return { files: filesWritten, warnings };
}

// ============================================================================
// Resolve a session token
// ============================================================================

async function resolveToken(args, humanMode) {
  if (args.token) {
    return args.token;
  }
  return null;
}

// ============================================================================
// Commands
// ============================================================================

async function cmdRegister(args) {
  const human = isHumanMode(args);
  const email = args.email;
  const name = args.name;

  if (!email) err("--email is required", human);

  const tempDomains = ["tempmail", "guerrilla", "10minute", "throwaway", "mailinator", "temp-mail", "fakeinbox", "trashmail"];
  const emailLower = email.toLowerCase();
  if (tempDomains.some(d => emailLower.includes(d))) {
    err("Temporary/disposable emails are not allowed. Please use a real email address.", human);
  }

  try {
    const result = await registerCli(email, name);
    const sessionToken = result.access_token;

    if (human) {
      console.log(`\n  Account created. Verification code sent to ${email}.`);
      console.log(`\n  Ask user: "Check your email for a 6-digit verification code."`);
      console.log(`\n  Then run: node tapi-auth.js verify --token ${sessionToken} --otp CODE`);
    } else {
      out("", false, {
        success: true,
        email,
        access_token: sessionToken,
        access_token_note: "Short-lived server session token for the verify step. Not stored.",
        next_step: "verify",
        action_required: "ask_user_for_otp",
        user_prompt: `Check your email (${email}) for a 6-digit verification code.`,
        next_command: `node ./scripts/tapi-auth.js verify --token ${sessionToken} --otp <CODE>`
      });
    }
  } catch (e) {
    err(e.message, human);
  }
}

async function cmdVerify(args) {
  const human = isHumanMode(args);
  const otp = args.otp;

  const token = await resolveToken(args, human);
  if (!token) err("--token is required", human);
  if (!otp) err("--otp is required", human);

  try {
    const result = await verifyCli(token, otp);
    const keyValue = result.api_key;

    const saved = saveApiKeyToConfigs(keyValue);

    if (human) {
      console.log(`\n  Email verified!`);
      console.log(`\n  API Key: ${keyValue}`);
      console.log(`\n  Key saved to:`);
      saved.files.forEach((f) => console.log(`    ${f.path}`));
      if (saved.warnings.length > 0) {
        console.log(`\n  Warnings:`);
        saved.warnings.forEach((w) => console.log(`    ${w}`));
      }
      console.log(`\n  To use in terminal/CLI, add to your shell profile:`);
      console.log(`    export TRANSCRIPT_API_KEY=${keyValue}`);
    } else {
      out("", false, {
        success: true,
        verified: true,
        api_key: keyValue,
        saved: { files: saved.files, warnings: saved.warnings },
        manual_export: `export TRANSCRIPT_API_KEY=${keyValue}`,
      });
    }
  } catch (e) {
    err(e.message, human);
  }
}

async function cmdGetKey(args) {
  const human = isHumanMode(args);

  const token = await resolveToken(args, human);
  if (!token) err("--token is required", human);

  try {
    let keys = await getApiKeys(token);
    let activeKey = keys.find((k) => k.is_active);

    if (!activeKey) {
      const newKey = await createApiKey(token);
      activeKey = newKey;
    }

    const keyValue = activeKey.key;
    out(keyValue, human, { api_key: keyValue });
  } catch (e) {
    err(e.message, human);
  }
}

async function cmdSaveKey(args) {
  const human = isHumanMode(args);
  const key = args.key;

  if (!key) err("--key is required", human);
  if (!key.startsWith("sk_")) err("Key should start with sk_", human);

  try {
    const saved = saveApiKeyToConfigs(key);

    if (human) {
      console.log("API key saved:\n");
      saved.files.forEach((f) => console.log(`  ${f.path}`));
      if (saved.warnings.length > 0) {
        console.log("\n  Warnings:");
        saved.warnings.forEach((w) => console.log(`    ${w}`));
      }
      console.log(`\n  To use in terminal/CLI, add to your shell profile:`);
      console.log(`    export TRANSCRIPT_API_KEY=${key}`);
    } else {
      out("", false, {
        success: true,
        files: saved.files,
        warnings: saved.warnings,
        manual_export: `export TRANSCRIPT_API_KEY=${key}`,
      });
    }
  } catch (e) {
    err(e.message, human);
  }
}

async function cmdStatus(args) {
  const human = isHumanMode(args);

  const token = await resolveToken(args, human);
  if (!token) err("--token is required", human);

  try {
    const me = await getMe(token);
    const keys = await getApiKeys(token);
    let verificationStatus;
    try {
      verificationStatus = await getEmailVerificationStatus(token);
    } catch {
      verificationStatus = { verified: me.is_verified || false };
    }

    const activeKeys = keys.filter((k) => k.is_active);

    if (human) {
      console.log("Account Status");
      console.log("==============");
      console.log(`Email:    ${me.email}`);
      console.log(`Name:     ${me.name || "(not set)"}`);
      console.log(`Verified: ${me.is_verified ? "Yes" : "No"}`);
      console.log(`API Keys: ${keys.length} total, ${activeKeys.length} active`);
    } else {
      out("", false, {
        email: me.email,
        name: me.name,
        is_verified: me.is_verified,
        verification_status: verificationStatus,
        api_keys_count: keys.length,
        active_keys_count: activeKeys.length,
      });
    }
  } catch (e) {
    err(e.message, human);
  }
}

function cmdHelp() {
  console.log(`
tapi-auth.js v${VERSION} - TranscriptAPI Account Setup (ClawHub Edition)

  Creates a TranscriptAPI account and sets up an API key. No passwords
  are involved — the server sends a one-time verification code to your
  email, and once verified, the API key is saved to the OpenClaw config
  (~/.openclaw/openclaw.json) for agent runtime access.

  For terminal/CLI usage, manually add to your shell profile:
    export TRANSCRIPT_API_KEY=<your-key>

USAGE:

  1. Register:  node ./scripts/tapi-auth.js register --email USER_EMAIL
     → Sends a 6-digit code to your email. Returns a session token.
     → Ask user: "Check your email for a 6-digit verification code."

  2. Verify:    node ./scripts/tapi-auth.js verify --token TOKEN --otp CODE
     → Verifies the code, saves API key to OpenClaw config. Done.

COMMANDS:
  register    Create account, sends verification code   --email (required), --name
  verify      Verify code, auto-save API key            --token, --otp
  get-key     Retrieve existing API key                 --token
  save-key    Manually save an API key                  --key
  status      Check account status                      --token

FLAGS:
  --human     Human-readable output (default is JSON)
`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  switch (command) {
    case "register":
      await cmdRegister(args);
      break;
    case "verify":
      await cmdVerify(args);
      break;
    case "get-key":
      await cmdGetKey(args);
      break;
    case "save-key":
      await cmdSaveKey(args);
      break;
    case "status":
      await cmdStatus(args);
      break;
    case "help":
    case undefined:
      cmdHelp();
      break;
    default:
      err(`Unknown command: ${command}. Run 'node tapi-auth.js help' for usage.`);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
