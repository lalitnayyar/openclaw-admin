/**
 * openclawadmin — choose classic workspace or workflow studio.
 *
 * DISCLAIMER: This software is provided “as is”, without express or implied warranty.
 * Maintainer: Lalit Nayyar <lalitnayyar@gmail.com>
 */

import { Link } from "react-router-dom";
import { DISCLAIMER_FOOTER, MAINTAINER_EMAIL, MAINTAINER_NAME } from "./lib/disclaimer";

export function Landing() {
  return (
    <div className="landing-root">
      <div className="landing-aurora" aria-hidden />
      <div className="landing-inner">
        <p className="landing-kicker">openclawadmin</p>
        <h1 className="landing-title">Configure OpenClaw your way</h1>
        <p className="landing-sub">
          Two interfaces, one JSON pipeline: edit <code className="mono">openclaw.json</code>, validate with the
          OpenClaw CLI when available, and write through the same Express API.
        </p>

        <div className="landing-cards">
          <Link className="landing-card landing-card-classic" to="/classic">
            <span className="landing-card-icon" aria-hidden>
              ◈
            </span>
            <h2>Classic workspace</h2>
            <p>Tabs for Raw JSON5, Browse, Channels, Plugins, and Agents — dense and fast for daily edits.</p>
            <span className="landing-card-cta">Open classic →</span>
          </Link>
          <Link className="landing-card landing-card-studio" to="/studio">
            <span className="landing-card-icon" aria-hidden>
              ✦
            </span>
            <h2>Workflow studio</h2>
            <p>Guided steps, aurora visuals, and a narrative flow from connect → ship without changing the backend.</p>
            <span className="landing-card-cta">Enter studio →</span>
          </Link>
        </div>

        <p className="landing-foot muted">
          <a href="https://docs.openclaw.ai/configuration">OpenClaw configuration</a>
          {" · "}
          <a href="https://docs.openclaw.ai/cli/config">CLI config</a>
        </p>

        <footer className="site-disclaimer landing-disclaimer">
          <p className="site-disclaimer-text">{DISCLAIMER_FOOTER}</p>
          <p className="site-disclaimer-contact">
            Name: {MAINTAINER_NAME} · Email: <a href={`mailto:${MAINTAINER_EMAIL}`}>{MAINTAINER_EMAIL}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
