/**
 * openclawadmin — workflow-style studio UI (same JSON backend as classic).
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

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useConfigEditor } from "../context/ConfigEditorContext";
import { ConfigExplorer } from "../components/ConfigExplorer";
import { AgentsPanel, ChannelsPanel, PluginsPanel } from "../shared/panels";
import { DISCLAIMER_FOOTER, MAINTAINER_EMAIL, MAINTAINER_NAME } from "../lib/disclaimer";
import { DOCS } from "../config/constants";
import "./studio.css";

const STEPS = [
  { label: "Connect", tag: "Gateway & file" },
  { label: "Sync", tag: "Load & probe" },
  { label: "Channels", tag: "Messaging" },
  { label: "Plugins", tag: "Extensions" },
  { label: "Agents", tag: "Tools & models" },
  { label: "Blueprint", tag: "JSON5" },
  { label: "Ship", tag: "Validate & save" },
] as const;

export function StudioWorkflow() {
  const [step, setStep] = useState(0);
  const ctx = useConfigEditor();

  const bannerClass =
    ctx.banner?.type === "error" ? "err" : ctx.banner?.type === "warn" ? "warn" : "ok";

  const parsed = ctx.parsedRoot !== null;

  const canGo = useMemo(
    () => ({
      next: step < STEPS.length - 1,
      prev: step > 0,
    }),
    [step],
  );

  return (
    <div className="studio-root">
      <header className="studio-topbar">
        <div className="studio-brand">
          <div className="studio-logo" aria-hidden />
          <div>
            <h1>OpenClaw Studio</h1>
            <span>Workflow edition · same JSON engine as Classic</span>
          </div>
        </div>
        <div className="studio-top-actions">
          <Link className="studio-link-classic" to="/classic">
            ← Classic workspace
          </Link>
        </div>
      </header>

      <div className="studio-shell">
        <div className="studio-hero">
          <h2>Shape your gateway in guided beats</h2>
          <p>
            Each step updates the same working <strong>openclaw.json</strong> buffer. Finish on <strong>Ship</strong>{" "}
            to validate against the OpenClaw CLI and write to disk. See{" "}
            <a href={DOCS} style={{ color: "#c4b5fd" }}>
              configuration docs
            </a>
            .
          </p>
        </div>

        <nav className="studio-rail" aria-label="Workflow steps">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              className={`studio-step-pill ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
              onClick={() => setStep(i)}
            >
              <span className="studio-step-num">{i + 1}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {ctx.banner ? (
          <div className={`studio-banner ${bannerClass}`} role="status">
            {ctx.banner.text}
          </div>
        ) : null}

        <div className="studio-card">
          {step === 0 ? (
            <>
              <h3>{STEPS[0].label}</h3>
              <p className="studio-lead">{STEPS[0].tag} — point the studio at your Control UI and config file.</p>
              <div className="studio-grid-2">
                <div className="studio-field">
                  <label>
                    Gateway / Control UI URL
                    <input
                      type="url"
                      value={ctx.gatewayBaseUrl}
                      onChange={(e) => ctx.setGatewayBaseUrl(e.target.value)}
                      placeholder="http://127.0.0.1:18789"
                      autoComplete="off"
                    />
                  </label>
                </div>
                <div className="studio-field">
                  <label>
                    Gateway token (optional)
                    <input
                      type="password"
                      value={ctx.gatewayToken}
                      onChange={(e) => ctx.setGatewayToken(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                </div>
                <div className="studio-field" style={{ gridColumn: "1 / -1" }}>
                  <label>
                    openclaw.json path
                    <input
                      type="text"
                      value={ctx.configPath}
                      onChange={(e) => ctx.setConfigPath(e.target.value)}
                      placeholder="~/.openclaw/openclaw.json"
                      autoComplete="off"
                    />
                  </label>
                  <div className="studio-chip-row">
                    <span className="studio-chip">Resolved: {ctx.resolvedPath || "—"}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h3>{STEPS[1].label}</h3>
              <p className="studio-lead">
                Pull the latest file from disk and optionally ping the gateway over HTTP.
              </p>
              <div className="studio-nav-row" style={{ marginTop: 0 }}>
                <button type="button" className="studio-btn studio-btn-primary" onClick={() => void ctx.load()} disabled={ctx.loading}>
                  Reload from disk
                </button>
                <button type="button" className="studio-btn studio-btn-ghost" onClick={() => void ctx.runProbe()} disabled={ctx.loading}>
                  Test gateway HTTP
                </button>
              </div>
              {ctx.probeResult ? (
                <p className="studio-lead" style={{ marginTop: "1rem", marginBottom: 0 }}>
                  {ctx.probeResult}
                </p>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h3>{STEPS[2].label}</h3>
              <p className="studio-lead">Merge channel blocks into your working JSON, then inspect the tree.</p>
              <div className="studio-panels-host">
                <ChannelsPanel
                  channels={(ctx.parsedRoot?.channels as Record<string, unknown> | undefined) ?? {}}
                  onApply={ctx.applyChannelsSlice}
                />
              </div>
              <h3 style={{ marginTop: "1.5rem", fontSize: "1rem" }}>Live channel map</h3>
              <p className="studio-lead" style={{ marginBottom: "0.75rem" }}>
                Read-only explorer for <code style={{ color: "#e9d5ff" }}>channels.*</code>
              </p>
              <div className="studio-panels-host app-shell-wide" style={{ maxWidth: "100%" }}>
                <ConfigExplorer
                  channels={ctx.channelsMap}
                  configPathDisplay={ctx.resolvedPath || ctx.configPath}
                  parseOk={parsed}
                />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h3>{STEPS[3].label}</h3>
              <p className="studio-lead">Allowlists, load paths, slots, and plugin entries.</p>
              <div className="studio-panels-host">
                <PluginsPanel
                  plugins={(ctx.parsedRoot?.plugins as Record<string, unknown> | undefined) ?? { enabled: true }}
                  onApply={ctx.applyPluginsSlice}
                />
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h3>{STEPS[4].label}</h3>
              <p className="studio-lead">Models, skills, tools, and sandbox defaults in one JSON tree.</p>
              <div className="studio-panels-host">
                <AgentsPanel
                  agents={(ctx.parsedRoot?.agents as Record<string, unknown> | undefined) ?? {}}
                  onApply={ctx.applyAgentsSlice}
                />
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h3>{STEPS[5].label}</h3>
              <p className="studio-lead">Direct JSON5 edit — this is exactly what will be validated and saved.</p>
              <textarea className="studio-json" value={ctx.editor} onChange={(e) => ctx.setEditor(e.target.value)} spellCheck={false} />
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h3>{STEPS[6].label}</h3>
              <p className="studio-lead">
                Run OpenClaw schema validation, then persist. Use the escape hatch only if the CLI is not installed on
                this host.
              </p>
              <label className="checkbox" style={{ color: "var(--studio-muted)", marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
                <input type="checkbox" checked={ctx.skipCli} onChange={(e) => ctx.setSkipCli(e.target.checked)} />
                Allow save without OpenClaw CLI validation (JSON5 parse only)
              </label>
              <div className="studio-nav-row" style={{ marginTop: 0 }}>
                <button type="button" className="studio-btn studio-btn-ghost studio-btn-xl" onClick={() => void ctx.runValidate()} disabled={ctx.loading}>
                  Validate
                </button>
                <button type="button" className="studio-btn studio-btn-primary studio-btn-xl" onClick={() => void ctx.runSave()} disabled={ctx.loading}>
                  Save to disk
                </button>
              </div>
            </>
          ) : null}

          <div className="studio-nav-row">
            <button type="button" className="studio-btn studio-btn-ghost" disabled={!canGo.prev} onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
            <button
              type="button"
              className="studio-btn studio-btn-primary"
              disabled={!canGo.next}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Next →
            </button>
          </div>
        </div>

        <footer className="site-disclaimer" style={{ marginTop: "2rem", borderColor: "var(--studio-border)" }}>
          <p className="site-disclaimer-text">{DISCLAIMER_FOOTER}</p>
          <p className="site-disclaimer-contact">
            Name: {MAINTAINER_NAME}
            {" · "}
            Email: <a href={`mailto:${MAINTAINER_EMAIL}`}>{MAINTAINER_EMAIL}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
