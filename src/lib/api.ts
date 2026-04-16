/**
 * openclawadmin — browser API helpers.
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

export type ConfigResponse =
  | {
      path: string;
      exists: boolean;
      content: string;
      parsed?: unknown;
      parseError?: string;
    }
  | { error: string };

export async function fetchConfig(configPath: string): Promise<ConfigResponse> {
  const q = new URLSearchParams();
  if (configPath.trim()) q.set("path", configPath.trim());
  const r = await fetch(`/api/config?${q.toString()}`);
  return r.json() as Promise<ConfigResponse>;
}

export async function validateConfig(content: string): Promise<unknown> {
  const r = await fetch("/api/config/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return r.json();
}

export async function saveConfig(
  path: string,
  content: string,
  skipCliValidation: boolean,
): Promise<unknown> {
  const r = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: path.trim(), content, skipCliValidation }),
  });
  const j = await r.json();
  if (!r.ok) {
    throw Object.assign(new Error("Save failed"), { body: j, status: r.status });
  }
  return j;
}

export async function probeGateway(baseUrl: string, token: string): Promise<unknown> {
  const q = new URLSearchParams({ baseUrl });
  if (token.trim()) q.set("token", token.trim());
  const r = await fetch(`/api/gateway/probe?${q.toString()}`);
  return r.json();
}
