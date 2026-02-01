#!/usr/bin/env node

const VERSION = "1.0.0";
const BASE_URL = "https://transcriptapi.com/api/auth";

// ============================================================================
// Utilities
// ============================================================================

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

function err(msg, jsonMode = false) {
  if (jsonMode) {
    console.error(JSON.stringify({ error: msg }));
  } else {
    console.error(`Error: ${msg}`);
  }
  process.exit(1);
}

function out(msg, jsonMode = false, data = null) {
  if (jsonMode) {
    console.log(JSON.stringify(data || { message: msg }));
  } else {
    console.log(msg);
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

async function register(email, password, name) {
  const payload = { email, password };
  if (name) payload.name = name;

  const res = await httpRequest(`${BASE_URL}/register`, {
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

async function sendVerificationOtp(token) {
  const res = await httpRequest(`${BASE_URL}/send-verification-otp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const msg = res.body?.detail || res.body?.message || "Failed to send OTP";
    throw new Error(msg);
  }

  return res.body;
}

async function verifyEmail(token, otp) {
  const res = await httpRequest(`${BASE_URL}/verify-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
// File System Helpers
// ============================================================================

const fs = require("fs");
const path = require("path");
const os = require("os");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function updateOrAppendEnvVar(filePath, varName, value) {
  ensureDir(path.dirname(filePath));

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

// ============================================================================
// Commands
// ============================================================================

async function cmdRegister(args) {
  const json = !!args.json;
  const email = args.email;
  const password = args.password;
  const name = args.name;

  if (!email) err("--email is required", json);
  if (!password) err("--password is required", json);

  // Check for obvious temp email domains
  const tempDomains = ["tempmail", "guerrilla", "10minute", "throwaway", "mailinator", "temp-mail", "fakeinbox", "trashmail"];
  const emailLower = email.toLowerCase();
  if (tempDomains.some(d => emailLower.includes(d))) {
    err("Temporary/disposable emails are not allowed. Please use a real email address.", json);
  }

  try {
    await register(email, password, name);
    const token = await login(email, password);
    await sendVerificationOtp(token);

    if (json) {
      out("", true, {
        success: true,
        email,
        password,
        password_note: "Save this — you need it for the verify step",
        next_step: "verify",
        action_required: "ask_user_for_otp",
        user_prompt: `Check your email (${email}) for a 6-digit verification code.`,
        next_command: `npx transcriptapi auth verify --email ${email} --password ${password} --otp <CODE> --json`
      });
    } else {
      console.log(`\n✓ Account created. Verification OTP sent to ${email}.`);
      console.log(`\n⚠️  Password: ${password} (save this for the next step!)`);
      console.log(`\n→ Ask user: "Check your email for a 6-digit verification code."`);
      console.log(`\n→ Then run: npx transcriptapi auth verify --email ${email} --password ${password} --otp CODE`);
    }
  } catch (e) {
    err(e.message, json);
  }
}

async function cmdVerify(args) {
  const json = !!args.json;
  const email = args.email;
  const password = args.password;
  const otp = args.otp;

  if (!email) err("--email is required", json);
  if (!password) err("--password is required", json);
  if (!otp) err("--otp is required", json);

  try {
    const token = await login(email, password);
    await verifyEmail(token, otp);

    // Get or create API key
    let keys = await getApiKeys(token);
    let activeKey = keys.find((k) => k.is_active);

    if (!activeKey) {
      const newKey = await createApiKey(token);
      activeKey = newKey;
    }

    const keyValue = activeKey.key;
    
    if (json) {
      out("", true, {
        success: true,
        verified: true,
        api_key: keyValue,
        next_step: "save-key",
        next_command: `npx transcriptapi auth save-key --key ${keyValue} --json`
      });
    } else {
      console.log(`\n✓ Email verified!`);
      console.log(`\n  API Key: ${keyValue}`);
      console.log(`\n→ Save it: npx transcriptapi auth save-key --key ${keyValue}`);
    }
  } catch (e) {
    err(e.message, json);
  }
}

async function cmdGetKey(args) {
  const json = !!args.json;
  const email = args.email;
  const password = args.password;

  if (!email) err("--email is required", json);
  if (!password) err("--password is required", json);

  try {
    const token = await login(email, password);
    let keys = await getApiKeys(token);
    let activeKey = keys.find((k) => k.is_active);

    if (!activeKey) {
      const newKey = await createApiKey(token);
      activeKey = newKey;
    }

    const keyValue = activeKey.key;
    out(keyValue, json, { api_key: keyValue });
  } catch (e) {
    err(e.message, json);
  }
}

async function cmdSaveKey(args) {
  const json = !!args.json;
  const key = args.key;

  if (!key) err("--key is required", json);
  if (!key.startsWith("sk_")) err("Key should start with sk_", json);

  const home = os.homedir();
  const platform = process.platform;
  const filesWritten = [];
  const warnings = [];

  try {
    // =========================================================================
    // 1. OpenClaw/Moltbot config (PRIMARY for agent skills)
    // =========================================================================
    const moltbotConfigPath = path.join(home, ".clawdbot", "moltbot.json");
    const openclawConfigPath = path.join(home, ".openclaw", "openclaw.json");
    
    let agentConfigPath = null;
    let agentConfigUpdated = false;
    
    // Try moltbot first, then openclaw
    if (fs.existsSync(moltbotConfigPath)) {
      agentConfigPath = moltbotConfigPath;
    } else if (fs.existsSync(openclawConfigPath)) {
      agentConfigPath = openclawConfigPath;
    }

    if (agentConfigPath) {
      try {
        const configContent = fs.readFileSync(agentConfigPath, "utf8");
        // Parse as JSON
        const config = JSON.parse(configContent);
        
        // Ensure skills.entries structure exists
        if (!config.skills) config.skills = {};
        if (!config.skills.entries) config.skills.entries = {};
        
        // Add/update transcriptapi entry
        if (!config.skills.entries.transcriptapi) {
          config.skills.entries.transcriptapi = {};
        }
        config.skills.entries.transcriptapi.apiKey = key;
        config.skills.entries.transcriptapi.enabled = true;

        fs.writeFileSync(agentConfigPath, JSON.stringify(config, null, 2));
        filesWritten.push({ path: agentConfigPath, action: "updated", type: "openclaw-config" });
        agentConfigUpdated = true;
      } catch (e) {
        warnings.push(`Could not update ${agentConfigPath}: ${e.message}`);
      }
    }

    // =========================================================================
    // 2. Shell RC files (for terminal/CLI usage)
    // =========================================================================
    
    if (platform === "darwin") {
      // macOS: zsh is default since Catalina (10.15)
      // ~/.zshenv is read by ALL zsh invocations (scripts, interactive, login)
      const zshenvPath = path.join(home, ".zshenv");
      const action = updateOrAppendEnvVar(zshenvPath, "TRANSCRIPT_API_KEY", key);
      filesWritten.push({ path: zshenvPath, action, type: "shell-rc" });

      // Also add to ~/.zprofile for login shells (belt and suspenders)
      const zprofilePath = path.join(home, ".zprofile");
      if (fs.existsSync(zprofilePath)) {
        const action2 = updateOrAppendEnvVar(zprofilePath, "TRANSCRIPT_API_KEY", key);
        filesWritten.push({ path: zprofilePath, action: action2, type: "shell-rc" });
      }

    } else if (platform === "linux") {
      // Linux: Multiple locations for different scenarios
      
      // ~/.profile - POSIX standard, login shells (sh, bash, dash)
      const profilePath = path.join(home, ".profile");
      const action1 = updateOrAppendEnvVar(profilePath, "TRANSCRIPT_API_KEY", key);
      filesWritten.push({ path: profilePath, action: action1, type: "shell-rc" });

      // ~/.bashrc - Interactive bash (many distros source this from .bash_profile)
      const bashrcPath = path.join(home, ".bashrc");
      if (fs.existsSync(bashrcPath)) {
        const action2 = updateOrAppendEnvVar(bashrcPath, "TRANSCRIPT_API_KEY", key);
        filesWritten.push({ path: bashrcPath, action: action2, type: "shell-rc" });
      }

      // ~/.zshenv - If user has zsh installed
      const zshenvPath = path.join(home, ".zshenv");
      if (fs.existsSync(zshenvPath) || fs.existsSync("/bin/zsh") || fs.existsSync("/usr/bin/zsh")) {
        const action3 = updateOrAppendEnvVar(zshenvPath, "TRANSCRIPT_API_KEY", key);
        filesWritten.push({ path: zshenvPath, action: action3, type: "shell-rc" });
      }

      // ~/.config/environment.d/ - Systemd user services (no 'export' keyword)
      const systemdDir = path.join(home, ".config", "environment.d");
      const systemdPath = path.join(systemdDir, "transcript-api.conf");
      const action4 = updateOrAppendSystemdEnv(systemdPath, "TRANSCRIPT_API_KEY", key);
      filesWritten.push({ path: systemdPath, action: action4, type: "systemd" });

    } else if (platform === "win32") {
      // Windows: Use PowerShell profile or just the fallback
      const psProfileDir = path.join(home, "Documents", "WindowsPowerShell");
      const psProfilePath = path.join(psProfileDir, "Microsoft.PowerShell_profile.ps1");
      try {
        ensureDir(psProfileDir);
        let content = "";
        if (fs.existsSync(psProfilePath)) {
          content = fs.readFileSync(psProfilePath, "utf8");
          // Remove existing line
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
        let content = "";
        if (fs.existsSync(fishConfigPath)) {
          content = fs.readFileSync(fishConfigPath, "utf8");
          // Remove existing line
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
    fs.writeFileSync(fallbackPath, key + "\n", { mode: 0o600 });
    filesWritten.push({ path: fallbackPath, action: "written", type: "fallback" });

    // =========================================================================
    // Output
    // =========================================================================
    if (json) {
      out("", true, { success: true, files: filesWritten, warnings });
    } else {
      console.log("API key saved:\n");
      
      const agentFiles = filesWritten.filter(f => f.type === "openclaw-config");
      const shellFiles = filesWritten.filter(f => f.type === "shell-rc");
      const otherFiles = filesWritten.filter(f => !["openclaw-config", "shell-rc"].includes(f.type));
      
      if (agentFiles.length > 0) {
        console.log("  OpenClaw/Moltbot (auto-injected at runtime):");
        agentFiles.forEach((f) => console.log(`    ✓ ${f.path}`));
        console.log("");
      }

      if (shellFiles.length > 0) {
        console.log("  Shell config (for terminal/CLI use):");
        shellFiles.forEach((f) => console.log(`    ✓ ${f.path}`));
        console.log("");
      }

      if (otherFiles.length > 0) {
        console.log("  Other:");
        otherFiles.forEach((f) => console.log(`    ✓ ${f.path} (${f.type})`));
        console.log("");
      }

      if (warnings.length > 0) {
        console.log("  Warnings:");
        warnings.forEach((w) => console.log(`    ⚠ ${w}`));
        console.log("");
      }

      console.log("To use immediately in current shell:");
      if (platform === "darwin") {
        console.log("  source ~/.zshenv");
      } else if (platform === "linux") {
        console.log("  source ~/.profile   # or restart your terminal");
      } else {
        console.log("  Restart your terminal or shell");
      }
      console.log("");
      
      if (agentConfigUpdated) {
        console.log("OpenClaw/Moltbot will auto-inject the key on next agent turn.");
      }
    }
  } catch (e) {
    err(e.message, json);
  }
}

async function cmdStatus(args) {
  const json = !!args.json;
  const email = args.email;
  const password = args.password;

  if (!email) err("--email is required", json);
  if (!password) err("--password is required", json);

  try {
    const token = await login(email, password);
    const me = await getMe(token);
    const keys = await getApiKeys(token);
    let verificationStatus;
    try {
      verificationStatus = await getEmailVerificationStatus(token);
    } catch {
      verificationStatus = { verified: me.is_verified || false };
    }

    const activeKeys = keys.filter((k) => k.is_active);

    if (json) {
      out("", true, {
        email: me.email,
        name: me.name,
        is_verified: me.is_verified,
        verification_status: verificationStatus,
        api_keys_count: keys.length,
        active_keys_count: activeKeys.length,
      });
    } else {
      console.log("Account Status");
      console.log("==============");
      console.log(`Email:    ${me.email}`);
      console.log(`Name:     ${me.name || "(not set)"}`);
      console.log(`Verified: ${me.is_verified ? "Yes" : "No"}`);
      console.log(`API Keys: ${keys.length} total, ${activeKeys.length} active`);
    }
  } catch (e) {
    err(e.message, json);
  }
}

function cmdHelp() {
  console.log(`
tapi-auth.js v${VERSION} - TranscriptAPI Account Setup

⚠️  CRITICAL: Do NOT use temporary/disposable emails. They will be blocked.
    Use a real email address that you control.

SETUP STEPS:
  Step 1: Register account
          npx transcriptapi auth register --email USER_EMAIL --password USER_PASSWORD
          → Sends 6-digit OTP to email
          ⚠️  SAVE THE PASSWORD — you need it again in Step 3!

  Step 2: Ask user for OTP
          → User checks their email inbox for the verification code

  Step 3: Verify email & get API key
          npx transcriptapi auth verify --email USER_EMAIL --password USER_PASSWORD --otp CODE
          → Returns API key (sk_...)
          (Use the SAME password from Step 1)

  Step 4: Save API key
          npx transcriptapi auth save-key --key API_KEY
          → Stores in shell config + agent config (auto-injected at runtime)

COMMANDS:
  register    Create account, sends OTP to email
  verify      Verify with OTP, returns API key
  get-key     Get API key (existing verified accounts)
  save-key    Save API key to environment
  status      Check account status
  help        Show this help

OPTIONS:
  --email EMAIL       User's email (required for register/verify/get-key/status)
  --password PASSWORD Account password (required for register/verify/get-key/status)
  --otp CODE          6-digit code from email (required for verify)
  --key SK_KEY        API key to save (required for save-key)
  --name NAME         Display name (optional, register only)
  --json              Machine-readable JSON output

EXAMPLES:
  npx transcriptapi auth register --email user@example.com --password secret123
  npx transcriptapi auth verify --email user@example.com --password secret123 --otp 482910
  npx transcriptapi auth save-key --key sk_abc123...
  npx transcriptapi auth status --email user@example.com --password secret123 --json

KEY STORAGE (save-key writes to all applicable):
  Agent config:  ~/.clawdbot/moltbot.json → skills.entries.transcriptapi.apiKey
  Shell:         ~/.zshenv (macOS) | ~/.profile + ~/.bashrc (Linux) | PowerShell (Windows)
  Fallback:      ~/.transcriptapi (plain file, mode 600)

FOR AI AGENTS:
  • Use --json for structured output
  • Register response includes password + pre-filled next_command — use it for verify
  • After Step 1, prompt user: "Check your email for a 6-digit verification code"
  • save-key auto-configures the agent runtime (no restart needed)
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
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
