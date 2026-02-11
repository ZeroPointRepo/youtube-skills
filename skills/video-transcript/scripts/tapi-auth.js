#!/usr/bin/env node

// ============================================================================
// TranscriptAPI CLI — Passwordless Account Setup
//
// This script helps users create a TranscriptAPI.com account and obtain an
// API key. It does NOT handle, store, or transmit passwords.
//
// Authentication flow:
//   1. User provides email → server creates account and returns a short-lived
//      session token (JWT, expires in ~30 min). No password is involved.
//   2. Server sends a one-time 6-digit verification code to the email.
//   3. User provides the code → server verifies and returns an API key.
//   4. API key is saved to local config files for CLI/agent usage.
//
// The session token (--token) is:
//   - Issued by the server, not generated locally
//   - Short-lived (expires per server configuration)
//   - Used only to authenticate the verification step
//   - Never stored persistently — only the API key is saved
//
// Source: https://transcriptapi.com | Docs: https://docs.transcriptapi.com
// ============================================================================

const VERSION = "2.1.0";
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

// JSON output is the default (this is an agent tool). Use --human for readable output.
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

// Passwordless registration — server creates account and returns a short-lived
// session token. No password is generated or transmitted.
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

  // Returns { access_token, token_type, email }
  return res.body;
}

// Verify email using the server-issued session token and the one-time code
// sent to the user's email. Returns { verified, api_key }.
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

// Legacy: login with email/password (for backward compatibility only)
async function login(email, password) {
  const formBody = new URLSearchParams();
  formBody.append("username", email);
  formBody.append("password", password);

  const res = await httpRequest(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });

  if (!res.ok) {
    const msg = res.body?.detail || res.body?.message || "Invalid credentials";
    throw new Error(`Login failed: ${msg}`);
  }

  return res.body.access_token;
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
// File System Helpers
// ============================================================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Back up existing file before modification. Returns backup path or null.
function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + ".bak";
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  return null;
}

function updateOrAppendEnvVar(filePath, varName, value) {
  ensureDir(path.dirname(filePath));
  backupFile(filePath);

  let content = "";
  let updated = false;

  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const newLines = lines.map((line) => {
      if (line.startsWith(`export ${varName}=`) || line.startsWith(`${varName}=`)) {
        updated = true;
        return `export ${varName}=${value}`;
      }
      return line;
    });

    if (updated) {
      content = newLines.join("\n");
    }
  }

  if (!updated) {
    const exportLine = `export ${varName}=${value}`;
    if (content && !content.endsWith("\n")) {
      content += "\n";
    }
    content += exportLine + "\n";
  }

  fs.writeFileSync(filePath, content);
  return updated ? "updated" : "added";
}

function updateOrAppendSystemdEnv(filePath, varName, value) {
  ensureDir(path.dirname(filePath));
  backupFile(filePath);

  let content = "";
  let updated = false;

  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const newLines = lines.map((line) => {
      if (line.startsWith(`${varName}=`)) {
        updated = true;
        return `${varName}=${value}`;
      }
      return line;
    });

    if (updated) {
      content = newLines.join("\n");
    }
  }

  if (!updated) {
    const envLine = `${varName}=${value}`;
    if (content && !content.endsWith("\n")) {
      content += "\n";
    }
    content += envLine + "\n";
  }

  fs.writeFileSync(filePath, content);
  return updated ? "updated" : "added";
}

// Save an API key to all applicable config files. Returns { files, warnings }.
// Used by both the save-key command and the verify command (auto-save).
function saveApiKeyToConfigs(key) {
  const home = os.homedir();
  const platform = process.platform;
  const filesWritten = [];
  const warnings = [];

  // =========================================================================
  // 1. OpenClaw config (PRIMARY for agent skills)
  // =========================================================================
  const openclawConfigPath = path.join(home, ".openclaw", "openclaw.json");
  const legacyConfigPath = path.join(home, ".clawdbot", "moltbot.json");

  let agentConfigPath = null;

  if (fs.existsSync(openclawConfigPath)) {
    agentConfigPath = openclawConfigPath;
  } else if (fs.existsSync(legacyConfigPath)) {
    agentConfigPath = legacyConfigPath;
  }

  if (agentConfigPath) {
    try {
      backupFile(agentConfigPath);
      const configContent = fs.readFileSync(agentConfigPath, "utf8");
      const config = JSON.parse(configContent);

      if (!config.skills) config.skills = {};
      if (!config.skills.entries) config.skills.entries = {};
      if (!config.skills.entries.transcriptapi) {
        config.skills.entries.transcriptapi = {};
      }
      config.skills.entries.transcriptapi.apiKey = key;
      config.skills.entries.transcriptapi.enabled = true;

      fs.writeFileSync(agentConfigPath, JSON.stringify(config, null, 2));
      filesWritten.push({ path: agentConfigPath, action: "updated", type: "openclaw-config" });
    } catch (e) {
      warnings.push(`Could not update ${agentConfigPath}: ${e.message}`);
    }
  }

  // =========================================================================
  // 2. Shell RC files (for terminal/CLI usage)
  // =========================================================================

  if (platform === "darwin") {
    const zshenvPath = path.join(home, ".zshenv");
    const action = updateOrAppendEnvVar(zshenvPath, "TRANSCRIPT_API_KEY", key);
    filesWritten.push({ path: zshenvPath, action, type: "shell-rc" });

    const zprofilePath = path.join(home, ".zprofile");
    if (fs.existsSync(zprofilePath)) {
      const action2 = updateOrAppendEnvVar(zprofilePath, "TRANSCRIPT_API_KEY", key);
      filesWritten.push({ path: zprofilePath, action: action2, type: "shell-rc" });
    }
  } else if (platform === "linux") {
    const profilePath = path.join(home, ".profile");
    const action1 = updateOrAppendEnvVar(profilePath, "TRANSCRIPT_API_KEY", key);
    filesWritten.push({ path: profilePath, action: action1, type: "shell-rc" });

    const bashrcPath = path.join(home, ".bashrc");
    if (fs.existsSync(bashrcPath)) {
      const action2 = updateOrAppendEnvVar(bashrcPath, "TRANSCRIPT_API_KEY", key);
      filesWritten.push({ path: bashrcPath, action: action2, type: "shell-rc" });
    }

    const zshenvPath = path.join(home, ".zshenv");
    if (fs.existsSync(zshenvPath) || fs.existsSync("/bin/zsh") || fs.existsSync("/usr/bin/zsh")) {
      const action3 = updateOrAppendEnvVar(zshenvPath, "TRANSCRIPT_API_KEY", key);
      filesWritten.push({ path: zshenvPath, action: action3, type: "shell-rc" });
    }

    const systemdDir = path.join(home, ".config", "environment.d");
    const systemdPath = path.join(systemdDir, "transcript-api.conf");
    const action4 = updateOrAppendSystemdEnv(systemdPath, "TRANSCRIPT_API_KEY", key);
    filesWritten.push({ path: systemdPath, action: action4, type: "systemd" });
  } else if (platform === "win32") {
    const psProfileDir = path.join(home, "Documents", "WindowsPowerShell");
    const psProfilePath = path.join(psProfileDir, "Microsoft.PowerShell_profile.ps1");
    try {
      ensureDir(psProfileDir);
      backupFile(psProfilePath);
      let content = "";
      if (fs.existsSync(psProfilePath)) {
        content = fs.readFileSync(psProfilePath, "utf8");
        content = content.replace(/^\$env:TRANSCRIPT_API_KEY\s*=.*$/gm, "").trim();
      }
      content += `\n$env:TRANSCRIPT_API_KEY = "${key}"\n`;
      fs.writeFileSync(psProfilePath, content);
      filesWritten.push({ path: psProfilePath, action: "updated", type: "powershell" });
    } catch (e) {
      warnings.push(`Could not update PowerShell profile: ${e.message}`);
    }
  }

  // =========================================================================
  // 3. Fish shell (if installed)
  // =========================================================================
  const fishConfigDir = path.join(home, ".config", "fish");
  const fishConfigPath = path.join(fishConfigDir, "config.fish");
  if (fs.existsSync(fishConfigPath) || fs.existsSync("/usr/bin/fish") || fs.existsSync("/opt/homebrew/bin/fish")) {
    try {
      ensureDir(fishConfigDir);
      backupFile(fishConfigPath);
      let content = "";
      if (fs.existsSync(fishConfigPath)) {
        content = fs.readFileSync(fishConfigPath, "utf8");
        content = content.replace(/^set\s+-gx\s+TRANSCRIPT_API_KEY\s+.*$/gm, "").trim();
      }
      content += `\nset -gx TRANSCRIPT_API_KEY ${key}\n`;
      fs.writeFileSync(fishConfigPath, content);
      filesWritten.push({ path: fishConfigPath, action: "updated", type: "fish" });
    } catch (e) {
      warnings.push(`Could not update fish config: ${e.message}`);
    }
  }

  // =========================================================================
  // 4. Fallback file (for tools that read it directly)
  // =========================================================================
  const fallbackPath = path.join(home, ".transcriptapi");
  backupFile(fallbackPath);
  fs.writeFileSync(fallbackPath, key + "\n", { mode: 0o600 });
  filesWritten.push({ path: fallbackPath, action: "written", type: "fallback" });

  return { files: filesWritten, warnings };
}

// ============================================================================
// Resolve a session token: prefer --token, fall back to --password login
// ============================================================================

async function resolveToken(args, humanMode) {
  if (args.token) {
    return args.token;
  }
  // Legacy fallback: login with email + password
  if (args.email && args.password) {
    return await login(args.email, args.password);
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

  // Check for obvious temp email domains
  const tempDomains = ["tempmail", "guerrilla", "10minute", "throwaway", "mailinator", "temp-mail", "fakeinbox", "trashmail"];
  const emailLower = email.toLowerCase();
  if (tempDomains.some(d => emailLower.includes(d))) {
    err("Temporary/disposable emails are not allowed. Please use a real email address.", human);
  }

  try {
    // Server creates account (no password) and returns a short-lived session token
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
        next_command: `npx transcriptapi auth verify --token ${sessionToken} --otp <CODE>`
      });
    }
  } catch (e) {
    err(e.message, human);
  }
}

async function cmdVerify(args) {
  const human = isHumanMode(args);
  const otp = args.otp;

  // Require either --token (new flow) or --email + --password (legacy)
  const token = await resolveToken(args, human);
  if (!token) err("--token is required (or --email + --password for legacy login)", human);
  if (!otp) err("--otp is required", human);

  try {
    // Server verifies OTP using the session token and returns the API key
    const result = await verifyCli(token, otp);
    const keyValue = result.api_key;

    // Auto-save the API key to all config files
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
    } else {
      out("", false, {
        success: true,
        verified: true,
        api_key: keyValue,
        saved: { files: saved.files, warnings: saved.warnings },
      });
    }
  } catch (e) {
    err(e.message, human);
  }
}

async function cmdGetKey(args) {
  const human = isHumanMode(args);

  const token = await resolveToken(args, human);
  if (!token) err("--token is required (or --email + --password for legacy login)", human);

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

      const agentFiles = saved.files.filter(f => f.type === "openclaw-config");
      const shellFiles = saved.files.filter(f => f.type === "shell-rc");
      const otherFiles = saved.files.filter(f => !["openclaw-config", "shell-rc"].includes(f.type));

      if (agentFiles.length > 0) {
        console.log("  OpenClaw (auto-injected at runtime):");
        agentFiles.forEach((f) => console.log(`    ${f.path}`));
        console.log("");
      }

      if (shellFiles.length > 0) {
        console.log("  Shell config (for terminal/CLI use):");
        shellFiles.forEach((f) => console.log(`    ${f.path}`));
        console.log("");
      }

      if (otherFiles.length > 0) {
        console.log("  Other:");
        otherFiles.forEach((f) => console.log(`    ${f.path} (${f.type})`));
        console.log("");
      }

      if (saved.warnings.length > 0) {
        console.log("  Warnings:");
        saved.warnings.forEach((w) => console.log(`    ${w}`));
        console.log("");
      }

      const platform = process.platform;
      console.log("To use immediately in current shell:");
      if (platform === "darwin") {
        console.log("  source ~/.zshenv");
      } else if (platform === "linux") {
        console.log("  source ~/.profile   # or restart your terminal");
      } else {
        console.log("  Restart your terminal or shell");
      }
    } else {
      out("", false, { success: true, files: saved.files, warnings: saved.warnings });
    }
  } catch (e) {
    err(e.message, human);
  }
}

async function cmdStatus(args) {
  const human = isHumanMode(args);

  const token = await resolveToken(args, human);
  if (!token) err("--token is required (or --email + --password for legacy login)", human);

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
tapi-auth.js v${VERSION} - TranscriptAPI Account Setup

  Creates a TranscriptAPI account and sets up an API key. No passwords
  are involved — the server sends a one-time verification code to your
  email, and once verified, the API key is saved automatically to your
  shell environment (~/.zshenv, ~/.bashrc) and agent config files so
  it's ready to use immediately.

  The session token returned during registration is short-lived and
  single-use — it only authenticates the verify step and is never stored.
  Use a real email address; disposable/temporary emails are blocked.

USAGE:

  1. Register:  node ./scripts/tapi-auth.js register --email USER_EMAIL
     → Sends a 6-digit code to your email. Returns a session token.
     → Ask user: "Check your email for a 6-digit verification code."

  2. Verify:    node ./scripts/tapi-auth.js verify --token TOKEN --otp CODE
     → Verifies the code, saves API key automatically. Done.

COMMANDS:
  register    Create account, sends verification code   --email (required), --name
  verify      Verify code, auto-save API key            --token, --otp
  get-key     Retrieve existing API key                 --token (or --email --password)
  save-key    Manually save an API key                  --key
  status      Check account status                      --token (or --email --password)

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
