/**
 * openclawadmin — main application shell and configuration editors.
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

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import JSON5 from "json5";
import { usePersistedState } from "./hooks/usePersistedState";
import {
  fetchConfig,
  probeGateway,
  saveConfig,
  validateConfig,
  type ConfigResponse,
} from "./lib/api";
import { parseConfig, setPath } from "./lib/merge";
import { ConfigExplorer } from "./components/ConfigExplorer";
import { DISCLAIMER_FOOTER, MAINTAINER_EMAIL, MAINTAINER_NAME } from "./lib/disclaimer";

type Tab = "raw" | "channels" | "plugins" | "tools" | "explorer";

const DOCS = "https://docs.openclaw.ai/configuration";

export function App() {
  const [gatewayBaseUrl, setGatewayBaseUrl] = usePersistedState(
    "openclawadmin.gateway",
    "http://127.0.0.1:18789",
  );
  const [configPath, setConfigPath] = usePersistedState(
    "openclawadmin.configPath",
    "~/.openclaw/openclaw.json",
  );
  const [gatewayToken, setGatewayToken] = usePersistedState("openclawadmin.gatewayToken", "");

  const [tab, setTab] = useState<Tab>("raw");
  const [editor, setEditor] = useState("");
  const [resolvedPath, setResolvedPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "error" | "success" | "warn"; text: string } | null>(
    null,
  );
  const [skipCli, setSkipCli] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const data = (await fetchConfig(configPath)) as ConfigResponse;
      if ("error" in data && data.error) {
        setBanner({ type: "error", text: data.error });
        return;
      }
      if ("parseError" in data && data.parseError) {
        setBanner({ type: "warn", text: `Parse issue — edit with care: ${data.parseError}` });
      }
      setResolvedPath(data.path);
      setEditor(data.content);
      if (!data.exists) {
        setBanner({
          type: "warn",
          text: "Config file not found yet — showing a starter template. Save to create it.",
        });
      }
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [configPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedRoot = useMemo(() => {
    try {
      return parseConfig(editor);
    } catch {
      return null;
    }
  }, [editor]);

  const channelsMap = useMemo((): Record<string, unknown> | null => {
    if (!parsedRoot) return null;
    const ch = parsedRoot.channels;
    if (ch !== undefined && ch !== null && typeof ch === "object" && !Array.isArray(ch)) {
      return ch as Record<string, unknown>;
    }
    return {};
  }, [parsedRoot]);

  const runValidate = async () => {
    setBanner(null);
    try {
      const r = (await validateConfig(editor)) as {
        ok?: boolean;
        errors?: string[];
        warning?: string;
        cliSkipped?: boolean;
        note?: string;
      };
      if (r.ok) {
        const extra = r.cliSkipped
          ? ` ${r.warning ?? ""} ${r.note ?? ""}`.trim()
          : " OpenClaw CLI validation passed.";
        setBanner({ type: "success", text: `Valid.${extra}` });
      } else {
        setBanner({
          type: "error",
          text: (r.errors ?? ["Unknown validation error"]).join("\n"),
        });
      }
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const runSave = async () => {
    setBanner(null);
    try {
      await saveConfig(configPath, editor, skipCli);
      setBanner({
        type: "success",
        text: `Saved to ${configPath}. Gateway reloads config from disk (see ${DOCS}).`,
      });
      await load();
    } catch (e: unknown) {
      const err = e as { body?: { errors?: string[]; error?: string }; message?: string };
      const msg =
        err.body?.errors?.join("\n") ??
        err.body?.error ??
        err.message ??
        String(e);
      setBanner({ type: "error", text: msg });
    }
  };

  const runProbe = async () => {
    setProbeResult(null);
    try {
      const r = (await probeGateway(gatewayBaseUrl, gatewayToken)) as {
        ok?: boolean;
        matched?: string;
        message?: string;
        status?: number;
      };
      if (r.ok) {
        setProbeResult(`Reachable (${r.status}) — ${r.matched ?? gatewayBaseUrl}`);
      } else {
        setProbeResult(r.message ?? "Probe completed without a healthy endpoint.");
      }
    } catch (e) {
      setProbeResult(e instanceof Error ? e.message : String(e));
    }
  };

  const applyChannelsSlice = (channels: Record<string, unknown>) => {
    try {
      const root = parseConfig(editor);
      setEditor(setPath(root, "channels", channels));
      setBanner({ type: "success", text: "Channels merged into editor. Review Raw JSON5, validate, then save." });
      setTab("raw");
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const applyPluginsSlice = (plugins: Record<string, unknown>) => {
    try {
      const root = parseConfig(editor);
      setEditor(setPath(root, "plugins", plugins));
      setBanner({ type: "success", text: "Plugins merged into editor. Review Raw JSON5, validate, then save." });
      setTab("raw");
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const applyAgentsSlice = (agents: Record<string, unknown>) => {
    try {
      const root = parseConfig(editor);
      const next = { ...root, agents };
      setEditor(JSON5.stringify(next, null, 2));
      setBanner({ type: "success", text: "Agents/tools section merged. Review Raw JSON5, validate, then save." });
      setTab("raw");
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className={`app-shell ${tab === "explorer" ? "app-shell-wide" : ""}`}>
      <header className="app-header">
        <div>
          <h1 className="app-title">OpenClaw configuration</h1>
          <p className="app-sub">
            Edit <code className="mono">openclaw.json</code> (JSON5) with validation aligned to the{" "}
            <a href={DOCS}>OpenClaw configuration docs</a>. Structured tabs merge into the raw document; comments
            are not preserved on merge.
          </p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: "1rem" }}>
        <div className="grid-2">
          <label className="field">
            <span className="key">Gateway / Control UI base URL</span>
            <input
              type="url"
              value={gatewayBaseUrl}
              onChange={(e) => setGatewayBaseUrl(e.target.value)}
              placeholder="http://127.0.0.1:18789"
              autoComplete="off"
            />
            <span className="muted">
              Browser dashboard default per docs:{" "}
              <a href="https://docs.openclaw.ai/">127.0.0.1:18789</a>. Use your machine IP for remote LAN access.
            </span>
          </label>
          <label className="field">
            <span className="key">Gateway token (optional)</span>
            <input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder="If your gateway requires auth headers"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="key">openclaw.json path</span>
            <input
              type="text"
              value={configPath}
              onChange={(e) => setConfigPath(e.target.value)}
              placeholder="~/.openclaw/openclaw.json"
              autoComplete="off"
            />
            <span className="muted">Resolved on server: {resolvedPath || "—"}</span>
          </label>
        </div>
        <div className="row" style={{ marginTop: "0.85rem" }}>
          <button type="button" className="btn" onClick={() => void runProbe()} disabled={loading}>
            Test gateway HTTP
          </button>
          <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
            Reload file
          </button>
          {probeResult ? <span className="muted">{probeResult}</span> : null}
        </div>
      </section>

      {banner ? (
        <div className={`banner ${banner.type === "error" ? "error" : banner.type === "warn" ? "warn" : "success"}`}>
          {banner.text}
        </div>
      ) : null}

      <div className="row" style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => void runValidate()} disabled={loading}>
          Validate
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void runSave()} disabled={loading}>
          Save to disk
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={skipCli} onChange={(e) => setSkipCli(e.target.checked)} />
          Allow save without OpenClaw CLI validation (JSON5 parse only)
        </label>
      </div>

      <div className="tabs">
        {(
          [
            ["raw", "Raw JSON5"],
            ["explorer", "Browse"],
            ["channels", "Channels"],
            ["plugins", "Plugins"],
            ["tools", "Agents & tools"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "raw" ? (
        <textarea className="code" value={editor} onChange={(e) => setEditor(e.target.value)} spellCheck={false} />
      ) : null}

      {tab === "explorer" ? (
        <ConfigExplorer
          channels={channelsMap}
          configPathDisplay={resolvedPath || configPath}
          parseOk={parsedRoot !== null}
        />
      ) : null}

      {tab === "channels" ? (
        <ChannelsPanel
          channels={(parsedRoot?.channels as Record<string, unknown> | undefined) ?? {}}
          onApply={applyChannelsSlice}
        />
      ) : null}

      {tab === "plugins" ? (
        <PluginsPanel
          plugins={(parsedRoot?.plugins as Record<string, unknown> | undefined) ?? { enabled: true }}
          onApply={applyPluginsSlice}
        />
      ) : null}

      {tab === "tools" ? (
        <AgentsPanel
          agents={(parsedRoot?.agents as Record<string, unknown> | undefined) ?? {}}
          onApply={applyAgentsSlice}
        />
      ) : null}

      <p className="muted" style={{ marginTop: "1.5rem" }}>
        Validation uses <code>openclaw config validate --json</code> with a temp file (see{" "}
        <a href="https://docs.openclaw.ai/cli/config">CLI config</a>). DM access patterns:{" "}
        <code>pairing</code>, <code>allowlist</code>, <code>open</code>, <code>disabled</code>.
      </p>

      <footer className="site-disclaimer">
        <p className="site-disclaimer-text">{DISCLAIMER_FOOTER}</p>
        <p className="site-disclaimer-contact">
          Name: {MAINTAINER_NAME}
          {" · "}
          Email:{" "}
          <a href={`mailto:${MAINTAINER_EMAIL}`}>{MAINTAINER_EMAIL}</a>
        </p>
      </footer>
    </div>
  );
}

function defaultChannelRows(channels: Record<string, unknown>): { id: string; json: string }[] {
  return Object.keys(channels).length
    ? Object.entries(channels).map(([id, v]) => ({ id, json: JSON.stringify(v, null, 2) }))
    : [{ id: "telegram", json: "{\n  \"enabled\": false,\n  \"dmPolicy\": \"pairing\"\n}" }];
}

function ChannelsPanel({
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
        <a href="https://docs.openclaw.ai/configuration#set-up-a-channel-whatsapp-telegram-discord-etc">channel docs</a>.
        Use JSON for each channel block (tokens, <code>dmPolicy</code>, <code>allowFrom</code>, etc.).
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

function PluginsPanel({
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

function AgentsPanel({
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
