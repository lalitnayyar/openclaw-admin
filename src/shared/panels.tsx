/**
 * openclawadmin — structured editors (channels, plugins, agents).
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

import { useEffect, useRef, useState } from "react";
import JSON5 from "json5";

export function defaultChannelRows(channels: Record<string, unknown>): { id: string; json: string }[] {
  return Object.keys(channels).length
    ? Object.entries(channels).map(([id, v]) => ({ id, json: JSON.stringify(v, null, 2) }))
    : [{ id: "telegram", json: "{\n  \"enabled\": false,\n  \"dmPolicy\": \"pairing\"\n}" }];
}

export function ChannelsPanel({
  channels,
  onApply,
}: {
  channels: Record<string, unknown>;
  onApply: (c: Record<string, unknown>) => void;
}) {
  const seed = JSON.stringify(channels);
  const [rows, setRows] = useState<{ id: string; json: string }[]>(() => defaultChannelRows(channels));
  const prevSeed = useRef(seed);
  useEffect(() => {
    if (prevSeed.current !== seed) {
      prevSeed.current = seed;
      setRows(defaultChannelRows(channels));
    }
  }, [seed, channels]);

  const addRow = () => setRows((r) => [...r, { id: "newchannel", json: "{}" }]);

  const build = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      const id = row.id.trim();
      if (!id) continue;
      out[id] = JSON5.parse(row.json);
    }
    return out;
  };

  return (
    <div className="card channel-editor">
      <p className="muted">
        Maps to <code>channels.{`{id}`}</code> per{" "}
        <a href="https://docs.openclaw.ai/configuration#set-up-a-channel-whatsapp-telegram-discord-etc">channel docs</a>
        . Use JSON for each channel block (tokens, <code>dmPolicy</code>, <code>allowFrom</code>, etc.).
      </p>
      {rows.map((row, i) => (
        <div key={i} className="card" style={{ background: "var(--bg-elevated)" }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <label className="field" style={{ flex: 1, maxWidth: 220 }}>
              <span className="key">Channel id</span>
              <input
                type="text"
                value={row.id}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((rs) => rs.map((x, j) => (j === i ? { ...x, id: v } : x)));
                }}
              />
            </label>
            <button
              type="button"
              className="pill-remove"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
          <label className="field">
            <span className="key">Channel JSON</span>
            <textarea
              className="code"
              style={{ minHeight: 140 }}
              value={row.json}
              onChange={(e) => {
                const v = e.target.value;
                setRows((rs) => rs.map((x, j) => (j === i ? { ...x, json: v } : x)));
              }}
              spellCheck={false}
            />
          </label>
        </div>
      ))}
      <div className="row">
        <button type="button" className="btn" onClick={addRow}>
          Add channel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            try {
              onApply(build());
            } catch (e) {
              alert(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Merge channels → editor
        </button>
      </div>
    </div>
  );
}

export function PluginsPanel({
  plugins,
  onApply,
}: {
  plugins: Record<string, unknown>;
  onApply: (p: Record<string, unknown>) => void;
}) {
  const enabled = plugins.enabled !== false;
  const [allow, setAllow] = useState(
    Array.isArray(plugins.allow) ? (plugins.allow as string[]).join(", ") : "",
  );
  const [deny, setDeny] = useState(
    Array.isArray(plugins.deny) ? (plugins.deny as string[]).join(", ") : "",
  );
  const loadPaths = (plugins.load as { paths?: string[] } | undefined)?.paths ?? [];
  const [pathsText, setPathsText] = useState(loadPaths.join("\n"));
  const slots = plugins.slots ?? {};
  const [slotsJson, setSlotsJson] = useState(JSON.stringify(slots, null, 2));
  const entries = plugins.entries ?? {};
  const [entriesJson, setEntriesJson] = useState(JSON.stringify(entries, null, 2));
  const [masterEnabled, setMasterEnabled] = useState(enabled);
  const seed = JSON.stringify(plugins);
  const prevSeed = useRef(seed);
  useEffect(() => {
    if (prevSeed.current === seed) return;
    prevSeed.current = seed;
    setAllow(Array.isArray(plugins.allow) ? (plugins.allow as string[]).join(", ") : "");
    setDeny(Array.isArray(plugins.deny) ? (plugins.deny as string[]).join(", ") : "");
    const paths = (plugins.load as { paths?: string[] } | undefined)?.paths ?? [];
    setPathsText(paths.join("\n"));
    setSlotsJson(JSON.stringify(plugins.slots ?? {}, null, 2));
    setEntriesJson(JSON.stringify(plugins.entries ?? {}, null, 2));
    setMasterEnabled(plugins.enabled !== false);
  }, [seed, plugins]);

  const merge = () => {
    let slotsParsed: unknown = {};
    let entriesParsed: unknown = {};
    try {
      slotsParsed = JSON5.parse(slotsJson);
      entriesParsed = JSON5.parse(entriesJson);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      return;
    }
    const next: Record<string, unknown> = {
      ...plugins,
      enabled: masterEnabled,
    };
    const a = allow
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const d = deny
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (a.length) next.allow = a;
    else delete next.allow;
    if (d.length) next.deny = d;
    else delete next.deny;
    const pLines = pathsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (pLines.length) {
      next.load = { ...((next.load as object) ?? {}), paths: pLines };
    } else if (next.load && typeof next.load === "object") {
      const L = { ...(next.load as Record<string, unknown>) };
      delete L.paths;
      if (Object.keys(L).length === 0) delete next.load;
      else next.load = L;
    }
    next.slots = slotsParsed;
    next.entries = entriesParsed;
    onApply(next);
  };

  return (
    <div className="card plugins-grid">
      <p className="muted">
        See <a href="https://docs.openclaw.ai/tools/plugin">Plugins</a> for <code>plugins.entries</code>, slots, and
        load paths.
      </p>
      <label className="checkbox">
        <input type="checkbox" checked={masterEnabled} onChange={(e) => setMasterEnabled(e.target.checked)} />
        <span>plugins.enabled</span>
      </label>
      <label className="field">
        <span className="key">plugins.allow (comma-separated ids)</span>
        <input type="text" value={allow} onChange={(e) => setAllow(e.target.value)} />
      </label>
      <label className="field">
        <span className="key">plugins.deny (comma-separated)</span>
        <input type="text" value={deny} onChange={(e) => setDeny(e.target.value)} />
      </label>
      <label className="field">
        <span className="key">plugins.load.paths (one per line)</span>
        <textarea className="code" style={{ minHeight: 72 }} value={pathsText} onChange={(e) => setPathsText(e.target.value)} />
      </label>
      <label className="field">
        <span className="key">plugins.slots (JSON)</span>
        <textarea className="code" style={{ minHeight: 100 }} value={slotsJson} onChange={(e) => setSlotsJson(e.target.value)} spellCheck={false} />
      </label>
      <label className="field">
        <span className="key">plugins.entries (JSON object)</span>
        <textarea className="code" style={{ minHeight: 160 }} value={entriesJson} onChange={(e) => setEntriesJson(e.target.value)} spellCheck={false} />
      </label>
      <button type="button" className="btn btn-primary" onClick={() => merge()}>
        Merge plugins → editor
      </button>
    </div>
  );
}

export function AgentsPanel({
  agents,
  onApply,
}: {
  agents: Record<string, unknown>;
  onApply: (a: Record<string, unknown>) => void;
}) {
  const seed = JSON.stringify(agents ?? {});
  const [json, setJson] = useState(() =>
    JSON.stringify(agents && Object.keys(agents).length ? agents : { defaults: {} }, null, 2),
  );
  const prevSeed = useRef(seed);
  useEffect(() => {
    if (prevSeed.current === seed) return;
    prevSeed.current = seed;
    setJson(JSON.stringify(agents && Object.keys(agents).length ? agents : { defaults: {} }, null, 2));
  }, [seed, agents]);

  return (
    <div className="card">
      <p className="muted">
        Full <code>agents</code> tree: models, <code>defaults.skills</code>, <code>defaults.tools</code>, sandboxing,
        etc. See{" "}
        <a href="https://docs.openclaw.ai/gateway/configuration-reference">configuration reference</a>.
      </p>
      <textarea className="code" style={{ minHeight: 280 }} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: "0.75rem" }}
        onClick={() => {
          try {
            onApply(JSON5.parse(json) as Record<string, unknown>);
          } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
          }
        }}
      >
        Merge agents → editor
      </button>
    </div>
  );
}
