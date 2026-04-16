/**
 * openclawadmin — classic tabbed workspace (original UI).
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

import { useState } from "react";
import { Link } from "react-router-dom";
import { useConfigEditor } from "../context/ConfigEditorContext";
import { ConfigExplorer } from "../components/ConfigExplorer";
import { AgentsPanel, ChannelsPanel, PluginsPanel } from "../shared/panels";
import { DISCLAIMER_FOOTER, MAINTAINER_EMAIL, MAINTAINER_NAME } from "../lib/disclaimer";
import { DOCS } from "../config/constants";

type Tab = "raw" | "channels" | "plugins" | "tools" | "explorer";

export function ClassicWorkspace() {
  const {
    gatewayBaseUrl,
    setGatewayBaseUrl,
    configPath,
    setConfigPath,
    gatewayToken,
    setGatewayToken,
    editor,
    setEditor,
    resolvedPath,
    loading,
    banner,
    skipCli,
    setSkipCli,
    probeResult,
    load,
    runValidate,
    runSave,
    runProbe,
    parsedRoot,
    channelsMap,
    applyChannelsSlice,
    applyPluginsSlice,
    applyAgentsSlice,
  } = useConfigEditor();

  const [tab, setTab] = useState<Tab>("raw");

  const mergeChannels = (c: Record<string, unknown>) => {
    applyChannelsSlice(c);
    setTab("raw");
  };
  const mergePlugins = (p: Record<string, unknown>) => {
    applyPluginsSlice(p);
    setTab("raw");
  };
  const mergeAgents = (a: Record<string, unknown>) => {
    applyAgentsSlice(a);
    setTab("raw");
  };

  return (
    <div className={`app-shell ${tab === "explorer" ? "app-shell-wide" : ""}`}>
      <header className="app-header">
        <div>
          <h1 className="app-title">OpenClaw configuration</h1>
          <p className="app-sub">
            <span className="workspace-badge workspace-badge-classic">Classic workspace</span> Edit{" "}
            <code className="mono">openclaw.json</code> (JSON5) with validation aligned to the{" "}
            <a href={DOCS}>OpenClaw configuration docs</a>. Structured tabs merge into the raw document; comments are
            not preserved on merge.
          </p>
        </div>
        <Link className="btn switch-workspace-link" to="/studio">
          Switch to workflow studio →
        </Link>
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
          onApply={mergeChannels}
        />
      ) : null}

      {tab === "plugins" ? (
        <PluginsPanel
          plugins={(parsedRoot?.plugins as Record<string, unknown> | undefined) ?? { enabled: true }}
          onApply={mergePlugins}
        />
      ) : null}

      {tab === "tools" ? (
        <AgentsPanel
          agents={(parsedRoot?.agents as Record<string, unknown> | undefined) ?? {}}
          onApply={mergeAgents}
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
