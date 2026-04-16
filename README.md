# openclawadmin

Unofficial **browser UI and API** for editing OpenClaw’s `openclaw.json` (JSON5) with optional CLI-backed schema validation, gateway URL probing, and structured helpers for channels, plugins, and agents.

**Maintainer:** Lalit Nayyar — [lalitnayyar@gmail.com](mailto:lalitnayyar@gmail.com)

**DISCLAIMER:** This software is provided “as is”, without express or implied warranty. You are solely responsible for configuration backups, validation, credential handling, and any impact on your OpenClaw gateway. This project is not affiliated with or endorsed by the OpenClaw project unless separately stated.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | Current LTS or recent stable (project uses ES modules and `fetch` in the server). |
| **npm** | For installing dependencies and running scripts. |
| **`openclaw` CLI** (recommended) | On `PATH` for `openclaw config validate --json` so saves match gateway schema. Optional if you only use JSON5 parse + “skip CLI validation” save. |

Official OpenClaw documentation: [https://docs.openclaw.ai/](https://docs.openclaw.ai/) — especially [Configuration](https://docs.openclaw.ai/configuration) and the [CLI `config`](https://docs.openclaw.ai/cli/config) reference.

---

## Quick start

```bash
cd openclawadmin
npm install
npm run dev
```

- **Frontend (Vite):** [http://127.0.0.1:5173](http://127.0.0.1:5173) — proxies `/api` to the local API.
- **API (Express):** [http://127.0.0.1:3847](http://127.0.0.1:3847) by default.

Open the UI at [http://127.0.0.1:5173/](http://127.0.0.1:5173/) — the **home** page lets you choose:

| Route | Experience |
|-------|------------|
| **`/`** | **Landing** — pick Classic or Studio. |
| **`/classic`** | **Classic workspace** — original tabbed UI (Raw JSON5, Browse, Channels, Plugins, Agents). |
| **`/studio`** | **Workflow studio** — guided step flow with a separate visual theme; same JSON buffer and backend. |

Set **Gateway / Control UI base URL** (e.g. `http://127.0.0.1:18789` or your host IP) and **`openclaw.json` path** (default `~/.openclaw/openclaw.json`), then **Reload file**, edit, **Validate**, and **Save to disk**. Settings are shared between Classic and Studio via `localStorage`.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Runs API + Vite dev server together (`concurrently`). |
| `npm run dev:client` | Vite only (port **5173**). |
| `npm run dev:server` | Express API only with `tsx watch` (port **3847**). |
| `npm run build` | Compiles `server/` to `dist-server/` and builds the React app to `dist/`. |
| `npm run preview` | Serves the built client (use with a separate API or adjust as needed). |
| `npm start` | **Production:** `NODE_ENV=production tsx server/index.ts` — serves static files from `dist/` and the same `/api` routes on **3847**. Run **`npm run build`** first. |

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENCLAWADMIN_PORT` | API listen port (default **3847**). Must match Vite dev proxy target in `vite.config.ts` if you change it. |
| `OPENCLAW_CONFIG_PATH` | Default config file path on the **server** when the UI does not pass `path` (still expanded for `~`). |

---

## Operations

### Where configuration is read and written

- The UI sends an explicit `path` (from the **openclaw.json path** field) on **GET**/**PUT** `/api/config`.
- The server expands `~/` using the **runtime user** that owns the Node process (often your login user under systemd or SSH).
- If the file does not exist, **GET** returns a **starter JSON5 template**; **Save** creates parent directories as needed.

OpenClaw expects optional JSON5 at `~/.openclaw/openclaw.json` by default; the gateway can watch the file for changes. See upstream docs for hot reload behavior.

### Validation and save

1. **Validate** — Parses JSON5, then runs `openclaw config validate --json` with a **temporary file** and `OPENCLAW_CONFIG_PATH` pointing at it. If the CLI is missing, the UI reports parse-only / CLI-skipped messaging.
2. **Save** — Same validation by default; rejects invalid schema output from the CLI. **“Allow save without OpenClaw CLI validation”** only enforces JSON5 parse before write (escape hatch when `openclaw` is not installed on the admin host).

Always keep **backups** of `openclaw.json` before bulk edits.

### Gateway probe

**Test gateway HTTP** calls the API route **`GET /api/gateway/probe`**, which tries common paths (`/`, `/health`, `/api/health`, `/v1/health`) against your configured base URL. Results depend on OpenClaw version; a failure does not necessarily mean the Control UI is down if it only answers on other routes.

### Production deployment

1. `npm run build`
2. `NODE_ENV=production npm start` (or run `tsx server/index.ts` behind **nginx**, **Caddy**, or **systemd** with `OPENCLAWADMIN_PORT` set).
3. Restrict network access (firewall / VPN): the API can read and write arbitrary paths passed from the client — treat this as a **privileged admin tool**, not a public multi-tenant service.

### Security notes

- **No built-in authentication** on the API. Bind to localhost or place behind a reverse proxy with auth if exposed beyond your machine.
- **Secrets** may appear in the browser when editing raw JSON; use masked views where implemented and prefer OpenClaw’s SecretRef patterns for production configs (see upstream docs).

---

## API summary (for operators and automation)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness + embedded disclaimer/maintainer metadata. |
| GET | `/api/config?path=` | Load config; `path` optional (uses server default). |
| POST | `/api/config/validate` | Body `{ "content": "<json5 string>" }` — parse + optional CLI validate. |
| PUT | `/api/config` | Body `{ "path", "content", "skipCliValidation?" }` — validate (unless skipped) and write file. |
| GET | `/api/gateway/probe?baseUrl=&token=` | Server-side HTTP probe to the gateway base URL. |

---

## Project layout (high level)

```
server/index.ts              Express API, validation, file I/O, gateway probe
src/App.tsx                  Router + ConfigEditorProvider
src/context/ConfigEditorContext.tsx   Shared JSON / gateway state
src/classic/ClassicWorkspace.tsx      Tabbed classic UI
src/studio/StudioWorkflow.tsx         Workflow studio UI + studio.css
src/Landing.tsx              Mode picker (/)
src/shared/panels.tsx        Channels / Plugins / Agents panels
src/components/ConfigExplorer.tsx     Channel explorer tree
src/lib/                     API client, JSON5 merge, disclaimer
vite.config.ts               Dev server + `/api` proxy
```

For **AI-assisted development** and full solution requirements, see **[AGENTS.md](./AGENTS.md)**.

---

## Repository (GitHub)

Canonical remote: **[github.com/lalitnayyar/openclaw-admin](https://github.com/lalitnayyar/openclaw-admin)**.

This clone may already have `origin` set to that URL. After you authenticate (`gh auth login`, **SSH** keys, or an **HTTPS** credential helper), publish `main`:

```bash
git remote -v
git push -u origin main
```

To open a **pull request** with the solution summary (for example from branch `feature/initial-openclawadmin`), push the branch and use GitHub’s **Compare & pull request** (base: `main`). Paste the contents of **[PR_BODY.md](./PR_BODY.md)** into the PR description, then merge when checks pass.

**Dual-UI update (classic + workflow studio):** branch `feature/dual-ui-studio-workflow` — use **[PR_DUAL_UI.md](./PR_DUAL_UI.md)** as the PR body. With [GitHub CLI](https://cli.github.com/) (`gh auth login`):

```bash
git push -u origin feature/dual-ui-studio-workflow
gh pr create --base main --head feature/dual-ui-studio-workflow \
  --title "feat: dual UI — classic workspace + workflow studio" \
  --body-file PR_DUAL_UI.md
gh pr merge --merge --delete-branch
```

---

## Upstream references

- [OpenClaw documentation](https://docs.openclaw.ai/)
- [Configuration overview](https://docs.openclaw.ai/configuration)
- [`openclaw config` CLI](https://docs.openclaw.ai/cli/config) (`validate`, `schema`, `get` / `set`)


