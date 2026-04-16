/**
 * openclawadmin — JSON5 merge helpers for structured editors.
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

import JSON5 from "json5";

export function parseConfig(text: string): Record<string, unknown> {
  const v = JSON5.parse(text) as unknown;
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error("Root config must be a JSON object");
  }
  return v as Record<string, unknown>;
}

export function setPath(
  root: Record<string, unknown>,
  key: "channels" | "plugins" | "agents",
  value: unknown,
): string {
  const next = { ...root, [key]: value };
  return JSON5.stringify(next, null, 2);
}
