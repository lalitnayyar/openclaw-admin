/**
 * openclawadmin — configuration browser / tree UI.
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

import { useCallback, useEffect, useMemo, useState } from "react";

function sensitiveKey(name: string): boolean {
  return /(token|secret|password|apikey|api_key|credential|auth|bearer|private)/i.test(name);
}

function childCount(value: unknown): number {
  if (value === null || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.length;
  return Object.keys(value).length;
}

function formatScalar(value: unknown, keyName: string): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    if (sensitiveKey(keyName)) {
      const n = value.length;
      return n ? `•••••••• (${n} chars)` : "(empty)";
    }
    const max = 200;
    if (value.length > max) return JSON.stringify(value.slice(0, max)) + "…";
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Paths to object/array nodes that default to expanded (depth-limited). */
function collectDefaultExpanded(
  value: unknown,
  path: string,
  maxDepth: number,
  depth: number,
  out: Set<string>,
): void {
  if (value === null || typeof value !== "object") return;
  if (depth >= maxDepth) return;
  if (path) out.add(path);
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const childPath = path ? `${path}[${i}]` : `[${i}]`;
      collectDefaultExpanded(item, childPath, maxDepth, depth + 1, out);
    });
  } else {
    for (const k of Object.keys(value as Record<string, unknown>).sort((a, b) => a.localeCompare(b))) {
      const childPath = path ? `${path}.${k}` : k;
      collectDefaultExpanded((value as Record<string, unknown>)[k], childPath, maxDepth, depth + 1, out);
    }
  }
}

type TreeRowsProps = {
  path: string;
  keyLabel: string;
  value: unknown;
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
};

function TreeRows({ path, keyLabel, value, depth, expanded, toggle }: TreeRowsProps) {
  const pad = 10 + depth * 16;
  const isBranch = value !== null && typeof value === "object";
  const open = expanded.has(path);
  const count = isBranch ? childCount(value) : 0;

  if (!isBranch) {
    return (
      <div className="explorer-kv-row" style={{ paddingLeft: pad }}>
        <span className="explorer-k">{keyLabel}</span>
        <span className="explorer-v mono">{formatScalar(value, keyLabel)}</span>
      </div>
    );
  }

  const keys = Array.isArray(value)
    ? value.map((_, i) => String(i))
    : Object.keys(value as Record<string, unknown>).sort((a, b) => a.localeCompare(b));

  return (
    <div className="explorer-branch">
      <button
        type="button"
        className={`explorer-kv-row explorer-kv-branch ${open ? "is-open" : ""}`}
        style={{ paddingLeft: pad }}
        onClick={() => toggle(path)}
        aria-expanded={open}
      >
        <span className="explorer-chevron" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
        <span className="explorer-k">{keyLabel}</span>
        <span className="explorer-type muted">{Array.isArray(value) ? `array[${count}]` : `object{${count}}`}</span>
      </button>
      {open ? (
        <div className="explorer-children">
          {keys.map((k) => {
            const childPath = Array.isArray(value)
              ? `${path}[${k}]`
              : path
                ? `${path}.${k}`
                : k;
            const childVal = Array.isArray(value)
              ? (value as unknown[])[Number(k)]
              : (value as Record<string, unknown>)[k];
            return (
              <TreeRows
                key={childPath}
                path={childPath}
                keyLabel={Array.isArray(value) ? `[${k}]` : k}
                value={childVal}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ConfigExplorer({
  channels,
  configPathDisplay,
  parseOk,
}: {
  channels: Record<string, unknown> | null;
  configPathDisplay: string;
  parseOk: boolean;
}) {
  const ids = useMemo(() => {
    if (!channels) return [];
    return Object.keys(channels).sort((a, b) => a.localeCompare(b));
  }, [channels]);

  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (ids.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((prev) => (prev && ids.includes(prev) ? prev : ids[0]!));
  }, [ids]);

  const selectedData = selected && channels ? channels[selected] : undefined;

  useEffect(() => {
    if (selectedData === undefined) {
      setExpanded(new Set());
      return;
    }
    const next = new Set<string>();
    collectDefaultExpanded(selectedData, "", 3, 0, next);
    if (Array.isArray(selectedData) && selectedData.length > 0) {
      next.add("");
    }
    setExpanded(next);
  }, [selected, selectedData]);

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  }, []);

  if (!parseOk) {
    return (
      <div className="explorer-layout card explorer-card">
        <div className="explorer-empty">
          <p className="explorer-empty-title">Cannot browse configuration</p>
          <p className="muted">Fix JSON5 syntax in the Raw JSON5 tab, then return here.</p>
        </div>
      </div>
    );
  }

  const topKeys =
    selectedData !== null && selectedData !== undefined && typeof selectedData === "object" && !Array.isArray(selectedData)
      ? Object.keys(selectedData as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
      : [];

  return (
    <div className="explorer-layout card explorer-card">
      <aside className="explorer-sidebar">
        <div className="explorer-sidebar-head">
          <span className="explorer-sidebar-title">Configuration</span>
          <span className="explorer-sidebar-sub mono" title={configPathDisplay}>
            {configPathDisplay || "openclaw.json"}
          </span>
        </div>
        <div className="explorer-fs-section">
          <div className="explorer-fs-folder">
            <span className="explorer-fs-chevron">▼</span>
            <span className="explorer-fs-icon" aria-hidden>
              📁
            </span>
            <span>channels</span>
            <span className="explorer-fs-badge">{ids.length}</span>
          </div>
          <div className="explorer-fs-children">
            {ids.length === 0 ? (
              <div className="explorer-fs-empty muted">No channel entries</div>
            ) : (
              ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`explorer-fs-item ${selected === id ? "is-active" : ""}`}
                  onClick={() => setSelected(id)}
                >
                  <span className="explorer-fs-icon" aria-hidden>
                    📄
                  </span>
                  <span className="explorer-fs-name mono">{id}</span>
                </button>
              ))
            )}
          </div>
        </div>
        <p className="explorer-sidebar-hint muted">
          Live view of <code className="mono">channels</code> from the editor buffer. Save to persist to disk.
        </p>
      </aside>
      <div className="explorer-main">
        {selected ? (
          <>
            <header className="explorer-main-head">
              <div className="explorer-breadcrumb mono">
                <span className="muted">channels</span>
                <span className="explorer-bc-sep">›</span>
                <span>{selected}</span>
              </div>
              <p className="explorer-main-sub muted">
                Click <span className="mono">▶</span> to expand nested objects and arrays. Values for sensitive keys
                are masked.
              </p>
            </header>
            <div className="explorer-tree">
              {selectedData === null || selectedData === undefined ? (
                <div className="explorer-kv-row muted" style={{ paddingLeft: 10 }}>
                  (null)
                </div>
              ) : typeof selectedData !== "object" ? (
                <div className="explorer-kv-row" style={{ paddingLeft: 10 }}>
                  <span className="explorer-k">value</span>
                  <span className="explorer-v mono">{formatScalar(selectedData, "value")}</span>
                </div>
              ) : Array.isArray(selectedData) ? (
                <TreeRows
                  path=""
                  keyLabel="[root]"
                  value={selectedData}
                  depth={0}
                  expanded={expanded}
                  toggle={toggle}
                />
              ) : topKeys.length === 0 ? (
                <div className="explorer-kv-row muted" style={{ paddingLeft: 10 }}>
                  Empty object
                </div>
              ) : (
                topKeys.map((k) => (
                  <TreeRows
                    key={k}
                    path={k}
                    keyLabel={k}
                    value={(selectedData as Record<string, unknown>)[k]}
                    depth={0}
                    expanded={expanded}
                    toggle={toggle}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="explorer-empty">
            <p className="explorer-empty-title">No channel selected</p>
            <p className="muted">
              Add entries under <code className="mono">channels</code> (see{" "}
              <a href="https://docs.openclaw.ai/configuration#set-up-a-channel-whatsapp-telegram-discord-etc">
                channel setup
              </a>
              ).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
