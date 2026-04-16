/**
 * openclawadmin — HTTP API for OpenClaw configuration files.
 *
 * DISCLAIMER: This software is provided “as is”, without express or implied warranty.
 * You are solely responsible for configuration backups, validation, credential handling,
 * and any impact on your OpenClaw gateway or related systems. This project is an
 * unofficial administrative helper and is not affiliated with or endorsed by the
 * OpenClaw project or its authors unless separately stated.
 *
 * Maintainer
 *   Name: Lalit Nayyar
 *   Email: lalitnayyar@gmail.com
 */

import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import JSON5 from "json5";

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.OPENCLAWADMIN_PORT ?? 3847);
const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p === "~") {
    return os.homedir();
  }
  return p;
}

function defaultConfigPath(): string {
  const env = process.env.OPENCLAW_CONFIG_PATH;
  if (env?.trim()) {
    return expandHome(env.trim());
  }
  return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

async function pathExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** Run OpenClaw schema validation against a temp copy of the config file. */
async function validateWithOpenClawCli(
  absoluteConfigPath: string,
): Promise<{ ok: boolean; usedCli: boolean; stdout?: string; stderr?: string; message?: string }> {
  try {
    const { stdout } = await execFileAsync(
      "openclaw",
      ["config", "validate", "--json"],
      {
        env: { ...process.env, OPENCLAW_CONFIG_PATH: absoluteConfigPath },
        maxBuffer: 20 * 1024 * 1024,
      },
    );
    let parsed: { ok?: boolean } = {};
    try {
      parsed = JSON.parse(String(stdout));
    } catch {
      return { ok: true, usedCli: true, stdout: String(stdout) };
    }
    return { ok: parsed.ok !== false, usedCli: true, stdout: String(stdout) };
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; code?: string; message?: string };
    const out = err.stdout ? String(err.stdout) : "";
    if (out) {
      try {
        const j = JSON.parse(out);
        return { ok: j.ok === true, usedCli: true, stdout: out, message: j.message };
      } catch {
        return { ok: false, usedCli: true, stdout: out, stderr: err.stderr ? String(err.stderr) : undefined };
      }
    }
    if (err.code === "ENOENT" || String(err.message).includes("openclaw")) {
      return { ok: false, usedCli: false, message: "openclaw CLI not found in PATH" };
    }
    return {
      ok: false,
      usedCli: true,
      message: err.message ?? "validate failed",
      stderr: err.stderr ? String(err.stderr) : undefined,
    };
  }
}

async function writeTempConfig(content: string): Promise<string> {
  const tmp = path.join(
    os.tmpdir(),
    `openclawadmin-validate-${process.pid}-${Date.now()}.json`,
  );
  await fs.writeFile(tmp, content, "utf8");
  return tmp;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "openclawadmin",
    disclaimer:
      "Provided as-is without express or implied warranty; you are responsible for validation, backups, and credential handling.",
    maintainer: { name: "Lalit Nayyar", email: "lalitnayyar@gmail.com" },
  });
});

app.get("/api/config", async (req, res) => {
  const raw = typeof req.query.path === "string" ? req.query.path : "";
  const configPath = raw.trim() ? expandHome(raw.trim()) : defaultConfigPath();
  try {
    if (!(await pathExists(configPath))) {
      return res.json({
        path: configPath,
        exists: false,
        content: defaultStarterConfig(),
        parsed: JSON5.parse(defaultStarterConfig()),
      });
    }
    const content = await fs.readFile(configPath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON5.parse(content);
    } catch (e) {
      return res.status(400).json({
        path: configPath,
        exists: true,
        content,
        parseError: e instanceof Error ? e.message : String(e),
      });
    }
    return res.json({ path: configPath, exists: true, content, parsed });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/config/validate", async (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  if (!content.trim()) {
    return res.status(400).json({ ok: false, errors: ["Empty content"] });
  }
  try {
    JSON5.parse(content);
  } catch (e) {
    return res.status(400).json({
      ok: false,
      errors: [`JSON5 parse: ${e instanceof Error ? e.message : String(e)}`],
    });
  }
  let tmp: string | undefined;
  try {
    tmp = await writeTempConfig(content);
    const cli = await validateWithOpenClawCli(tmp);
    if (!cli.usedCli) {
      return res.json({
        ok: true,
        parseOk: true,
        cliSkipped: true,
        warning: cli.message,
        note: "Install OpenClaw and ensure `openclaw` is on PATH for schema validation matching the gateway.",
      });
    }
    if (!cli.ok) {
      let errors: string[] = [];
      try {
        const j = JSON.parse(cli.stdout ?? "{}");
        if (Array.isArray(j.errors)) {
          errors = j.errors.map(
            (x: { message?: string; kind?: string }) => x.message ?? JSON.stringify(x),
          );
        } else if (j.message) {
          errors = [String(j.message)];
        }
      } catch {
        errors = [cli.stderr ?? cli.stdout ?? "Validation failed"];
      }
      return res.json({ ok: false, parseOk: true, cli: true, errors, raw: cli.stdout });
    }
    return res.json({ ok: true, parseOk: true, cli: true, detail: cli.stdout });
  } catch (e) {
    return res.status(500).json({ ok: false, errors: [e instanceof Error ? e.message : String(e)] });
  } finally {
    if (tmp) await fs.unlink(tmp).catch(() => {});
  }
});

app.put("/api/config", async (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  const rawPath = typeof req.body?.path === "string" ? req.body.path.trim() : "";
  const skipCli = Boolean(req.body?.skipCliValidation);
  const configPath = rawPath ? expandHome(rawPath) : defaultConfigPath();

  if (!content.trim()) {
    return res.status(400).json({ ok: false, error: "Empty content" });
  }

  try {
    JSON5.parse(content);
  } catch (e) {
    return res.status(400).json({
      ok: false,
      error: `JSON5 parse: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  if (!skipCli) {
    const tmp = await writeTempConfig(content);
    try {
      const cli = await validateWithOpenClawCli(tmp);
      if (cli.usedCli && !cli.ok) {
        let errors: string[] = [];
        try {
          const j = JSON.parse(cli.stdout ?? "{}");
          if (Array.isArray(j.errors)) {
            errors = j.errors.map(
              (x: { message?: string }) => x.message ?? JSON.stringify(x),
            );
          }
        } catch {
          errors = [cli.stdout ?? "Validation failed"];
        }
        return res.status(400).json({ ok: false, errors, phase: "openclaw-schema" });
      }
      if (!cli.usedCli) {
        return res.status(400).json({
          ok: false,
          error:
            "OpenClaw CLI not available for validation. Save with “Allow save without CLI validation” or install OpenClaw.",
          code: "NO_CLI",
        });
      }
    } finally {
      await fs.unlink(tmp).catch(() => {});
    }
  }

  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, content, "utf8");
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }

  return res.json({
    ok: true,
    path: configPath,
    note: "Gateway watches openclaw.json; restart may follow automatically per OpenClaw docs.",
  });
});

/** Probe Control UI / gateway HTTP (best-effort; paths vary by version). */
app.get("/api/gateway/probe", async (req, res) => {
  const base =
    typeof req.query.baseUrl === "string" && req.query.baseUrl.trim()
      ? req.query.baseUrl.trim().replace(/\/$/, "")
      : "http://127.0.0.1:18789";
  const token =
    typeof req.query.token === "string" && req.query.token.trim()
      ? req.query.token.trim()
      : "";

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["x-openclaw-token"] = token;
  }

  const paths = ["/", "/health", "/api/health", "/v1/health"];
  const attempts: { url: string; status: number; ok: boolean }[] = [];

  for (const p of paths) {
    const url = `${base}${p}`;
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      attempts.push({ url, status: r.status, ok: r.ok });
      if (r.ok) {
        return res.json({ ok: true, baseUrl: base, matched: url, status: r.status, attempts });
      }
    } catch (e) {
      attempts.push({
        url,
        status: 0,
        ok: false,
      });
    }
  }

  return res.json({
    ok: false,
    baseUrl: base,
    message:
      "No successful HTTP response from common health paths. The Control UI may still be reachable in a browser.",
    attempts,
    docs: "https://docs.openclaw.ai/configuration",
  });
});

function defaultStarterConfig(): string {
  return `{
  // OpenClaw optional JSON5 config — https://docs.openclaw.ai/configuration
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
  channels: {
    // telegram: { enabled: true, botToken: "...", dmPolicy: "pairing" },
  },
  plugins: {
    enabled: true,
    // entries: { "voice-call": { enabled: true, config: { provider: "twilio" } } },
  },
}
`;
}

app.use(express.static(path.join(process.cwd(), "dist")));

app.get("*", (req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`openclawadmin API http://127.0.0.1:${PORT}`);
  console.log(
    "DISCLAIMER: Provided as-is without warranty. Maintainer: Lalit Nayyar <lalitnayyar@gmail.com>",
  );
});
